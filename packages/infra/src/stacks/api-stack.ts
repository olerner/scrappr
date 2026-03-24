import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as cdk from "aws-cdk-lib";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as authorizers from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as cw_actions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import type * as s3 from "aws-cdk-lib/aws-s3";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subs from "aws-cdk-lib/aws-sns-subscriptions";
import type { Construct } from "constructs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface ApiStackProps extends cdk.StackProps {
  stageName: string;
  userPoolId: string;
  userPoolClientId: string;
  photoBucket: s3.IBucket;
}

export class ApiStack extends cdk.Stack {
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const { stageName, userPoolId, userPoolClientId, photoBucket } = props;

    // ── DynamoDB Table ──────────────────────────────────────────────

    const listingsTable = new dynamodb.Table(this, "ListingsTable", {
      tableName: `scrappr-listings-${stageName}`,
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "listingId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: stageName === "prod" ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // ── Lambda Functions ────────────────────────────────────────────

    const lambdasDir = path.join(__dirname, "../lambdas");

    const presignFn = new lambda.Function(this, "PresignFn", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "presign.handler",
      code: lambda.Code.fromAsset(lambdasDir),
      environment: {
        PHOTO_BUCKET: photoBucket.bucketName,
      },
      timeout: cdk.Duration.seconds(10),
    });
    photoBucket.grantPut(presignFn);

    const createListingFn = new lambda.Function(this, "CreateListingFn", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "create-listing.handler",
      code: lambda.Code.fromAsset(lambdasDir),
      environment: {
        LISTINGS_TABLE: listingsTable.tableName,
      },
      timeout: cdk.Duration.seconds(10),
    });
    listingsTable.grantWriteData(createListingFn);

    const getListingsFn = new lambda.Function(this, "GetListingsFn", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "get-listings.handler",
      code: lambda.Code.fromAsset(lambdasDir),
      environment: {
        LISTINGS_TABLE: listingsTable.tableName,
      },
      timeout: cdk.Duration.seconds(10),
    });
    listingsTable.grantReadData(getListingsFn);

    // ── HTTP API Gateway ────────────────────────────────────────────

    const issuerUrl = `https://cognito-idp.${this.region}.amazonaws.com/${userPoolId}`;

    const jwtAuthorizer = new authorizers.HttpJwtAuthorizer("CognitoAuth", issuerUrl, {
      jwtAudience: [userPoolClientId],
    });

    const httpApi = new apigatewayv2.HttpApi(this, "HttpApi", {
      apiName: `scrappr-api-${stageName}`,
      corsPreflight: {
        allowOrigins: ["http://localhost:5173", "http://localhost:4173", "https://*"],
        allowMethods: [
          apigatewayv2.CorsHttpMethod.GET,
          apigatewayv2.CorsHttpMethod.POST,
          apigatewayv2.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ["Content-Type", "Authorization"],
        maxAge: cdk.Duration.hours(1),
      },
    });

    httpApi.addRoutes({
      path: "/photos/presign",
      methods: [apigatewayv2.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration("PresignInt", presignFn),
      authorizer: jwtAuthorizer,
    });

    httpApi.addRoutes({
      path: "/listings",
      methods: [apigatewayv2.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration("CreateListingInt", createListingFn),
      authorizer: jwtAuthorizer,
    });

    httpApi.addRoutes({
      path: "/listings",
      methods: [apigatewayv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration("GetListingsInt", getListingsFn),
      authorizer: jwtAuthorizer,
    });

    // ── Frontend Error Reporting Lambda ──────────────────────────────

    const reportErrorFn = new lambda.Function(this, "ReportErrorFn", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "report-error.handler",
      code: lambda.Code.fromAsset(lambdasDir),
      timeout: cdk.Duration.seconds(10),
    });

    httpApi.addRoutes({
      path: "/errors",
      methods: [apigatewayv2.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration("ReportErrorInt", reportErrorFn),
      // No authorizer — unauthenticated so frontend can report errors before/after sign-in
    });

    this.apiUrl = httpApi.apiEndpoint;

    // ── SNS Alert Topic ───────────────────────────────────────────

    const isPreview = stageName.startsWith("pr-");

    const alertTopic = new sns.Topic(this, "ErrorAlertTopic", {
      topicName: `scrappr-errors-${stageName}`,
    });
    if (!isPreview) {
      alertTopic.addSubscription(new subs.EmailSubscription("trevbot@trevor.fail"));
      alertTopic.addSubscription(new subs.EmailSubscription("trevorlitsey@gmail.com"));
    }

    // ── CloudWatch Alarms ─────────────────────────────────────────

    const allFns = [
      { id: "Presign", fn: presignFn },
      { id: "CreateListing", fn: createListingFn },
      { id: "GetListings", fn: getListingsFn },
      { id: "ReportError", fn: reportErrorFn },
    ];

    for (const { id, fn } of allFns) {
      // Alarm on Lambda invocation errors (crashes, timeouts, OOM)
      const invocationAlarm = fn
        .metricErrors({ period: cdk.Duration.minutes(5) })
        .createAlarm(this, `${id}ErrorAlarm`, {
          alarmName: `scrappr-${id}-errors-${stageName}`,
          threshold: 1,
          evaluationPeriods: 1,
          treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        });
      invocationAlarm.addAlarmAction(new cw_actions.SnsAction(alertTopic));

      // Alarm on application-level errors (caught 500s logged as "level":"ERROR")
      const logGroup = fn.logGroup;
      const metricFilter = new logs.MetricFilter(this, `${id}AppErrorFilter`, {
        logGroup,
        filterPattern: logs.FilterPattern.literal('"level":"ERROR"'),
        metricNamespace: `Scrappr/${stageName}`,
        metricName: `${id}AppErrors`,
        metricValue: "1",
      });

      const appErrorAlarm = new cloudwatch.Alarm(this, `${id}AppErrorAlarm`, {
        alarmName: `scrappr-${id}-app-errors-${stageName}`,
        metric: metricFilter.metric({ period: cdk.Duration.minutes(5), statistic: "Sum" }),
        threshold: 1,
        evaluationPeriods: 1,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      appErrorAlarm.addAlarmAction(new cw_actions.SnsAction(alertTopic));
    }

    // ── Outputs ─────────────────────────────────────────────────────

    new cdk.CfnOutput(this, "ApiEndpoint", {
      value: httpApi.apiEndpoint,
      exportName: `scrappr-api-endpoint-${stageName}`,
    });
  }
}
