import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as cdk from "aws-cdk-lib";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as authorizers from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import type * as s3 from "aws-cdk-lib/aws-s3";
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

    this.apiUrl = httpApi.apiEndpoint;

    // ── Outputs ─────────────────────────────────────────────────────

    new cdk.CfnOutput(this, "ApiEndpoint", {
      value: httpApi.apiEndpoint,
      exportName: `scrappr-api-endpoint-${stageName}`,
    });
  }
}
