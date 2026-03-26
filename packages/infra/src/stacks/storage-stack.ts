import * as cdk from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3 from "aws-cdk-lib/aws-s3";
import type { Construct } from "constructs";

interface StorageStackProps extends cdk.StackProps {
  stageName: string;
}

export class StorageStack extends cdk.Stack {
  public readonly photoBucket: s3.Bucket;
  public readonly photoBucketUrl: string;

  constructor(scope: Construct, id: string, props: StorageStackProps) {
    super(scope, id, props);

    const isProd = props.stageName === "prod";
    const isPreview = props.stageName.startsWith("pr-");

    this.photoBucket = new s3.Bucket(this, "PhotoBucket", {
      bucketName: `scrappr-photos-${props.stageName}-${this.account}`,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProd,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      cors: [
        {
          // PUT only — uploads go directly to S3 via presigned URL; reads go through CloudFront
          allowedMethods: [s3.HttpMethods.PUT],
          allowedOrigins: isPreview
            ? ["https://*"]
            : ["http://localhost:5173", "http://localhost:4173", "https://scrappr.trevor.fail"],
          allowedHeaders: ["*"],
          maxAge: 3600,
        },
      ],
    });

    const distribution = new cloudfront.Distribution(this, "PhotoBucketCDN", {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.photoBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
    });

    this.photoBucketUrl = `https://${distribution.distributionDomainName}`;

    new cdk.CfnOutput(this, "PhotoBucketName", {
      value: this.photoBucket.bucketName,
      exportName: `scrappr-photo-bucket-${props.stageName}`,
    });

    new cdk.CfnOutput(this, "PhotoBucketRegion", {
      value: this.region,
    });

    new cdk.CfnOutput(this, "PhotoBucketUrl", {
      value: this.photoBucketUrl,
      exportName: `scrappr-photo-bucket-url-${props.stageName}`,
    });
  }
}
