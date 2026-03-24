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

  private readonly alertTopic: sns.Topic;
  private readonly stageName: string;
  private readonly lambdasDir: string;

  /** Create a Lambda with alarms automatically attached. All Lambdas should use this. */
  private createLambda(
    id: string,
    props: Omit<lambda.FunctionProps, "runtime" | "code">,
  ): lambda.Function {
    const fn = new lambda.Function(this, `${id}Fn`, {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset(this.lambdasDir),
      timeout: cdk.Duration.seconds(10),
      ...props,
    });

    // Alarm on Lambda invocation errors (crashes, timeouts, OOM)
    const invocationAlarm = fn
      .metricErrors({ period: cdk.Duration.minutes(5) })
      .createAlarm(this, `${id}ErrorAlarm`, {
        alarmName: `scrappr-${id}-errors-${this.stageName}`,
        threshold: 1,
        evaluationPeriods: 1,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
    invocationAlarm.addAlarmAction(new cw_actions.SnsAction(this.alertTopic));

    // Alarm on application-level errors (caught 500s logged as "level":"ERROR")
    const metricFilter = new logs.MetricFilter(this, `${id}AppErrorFilter`, {
      logGroup: fn.logGroup,
      filterPattern: logs.FilterPattern.literal('"level":"ERROR"'),
      metricNamespace: `Scrappr/${this.stageName}`,
      metricName: `${id}AppErrors`,
      metricValue: "1",
    });

    const appErrorAlarm = new cloudwatch.Alarm(this, `${id}AppErrorAlarm`, {
      alarmName: `scrappr-${id}-app-errors-${this.stageName}`,
      metric: metricFilter.metric({ period: cdk.Duration.minutes(5), statistic: "Sum" }),
      threshold: 1,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    appErrorAlarm.addAlarmAction(new cw_actions.SnsAction(this.alertTopic));

    return fn;
  }

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const { stageName, userPoolId, userPoolClientId, photoBucket } = props;
    this.stageName = stageName;
    this.lambdasDir = path.join(__dirname, "../lambdas");
    const isPreview = stageName.startsWith("pr-");

    // ── SNS Alert Topic ───────────────────────────────────────────

    this.alertTopic = new sns.Topic(this, "ErrorAlertTopic", {
      topicName: `scrappr-errors-${stageName}`,
    });
    if (!isPreview) {
      this.alertTopic.addSubscription(new subs.EmailSubscription("trevbot@trevor.fail"));
      this.alertTopic.addSubscription(new subs.EmailSubscription("trevorlitsey@gmail.com"));
    }

    // ── DynamoDB Table ──────────────────────────────────────────────

    const listingsTable = new dynamodb.Table(this, "ListingsTable", {
      tableName: `scrappr-listings-${stageName}`,
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "listingId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: stageName === "prod" ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // ── Lambda Functions ────────────────────────────────────────────

    const presignFn = this.createLambda("Presign", {
      handler: "presign.handler",
      environment: { PHOTO_BUCKET: photoBucket.bucketName },
    });
    photoBucket.grantPut(presignFn);

    const createListingFn = this.createLambda("CreateListing", {
      handler: "create-listing.handler",
      environment: { LISTINGS_TABLE: listingsTable.tableName },
    });
    listingsTable.grantWriteData(createListingFn);

    const getListingsFn = this.createLambda("GetListings", {
      handler: "get-listings.handler",
      environment: { LISTINGS_TABLE: listingsTable.tableName },
    });
    listingsTable.grantReadData(getListingsFn);

    const reportErrorFn = this.createLambda("ReportError", {
      handler: "report-error.handler",
    });

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

    httpApi.addRoutes({
      path: "/errors",
      methods: [apigatewayv2.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration("ReportErrorInt", reportErrorFn),
      // No authorizer — unauthenticated so frontend can report errors before/after sign-in
    });

    this.apiUrl = httpApi.apiEndpoint;

    // ── Outputs ─────────────────────────────────────────────────────

    new cdk.CfnOutput(this, "ApiEndpoint", {
      value: httpApi.apiEndpoint,
      exportName: `scrappr-api-endpoint-${stageName}`,
    });
  }
}
