import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import type { Construct } from "constructs";

interface StorageStackProps extends cdk.StackProps {
  stageName: string;
}

export class StorageStack extends cdk.Stack {
  public readonly photoBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: StorageStackProps) {
    super(scope, id, props);

    const isProd = props.stageName === "prod";

    this.photoBucket = new s3.Bucket(this, "PhotoBucket", {
      bucketName: `scrappr-photos-${props.stageName}-${this.account}`,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProd,
      publicReadAccess: true,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        ignorePublicAcls: false,
        blockPublicPolicy: false,
        restrictPublicBuckets: false,
      }),
      cors: [
        {
          allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.GET],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
          maxAge: 3600,
        },
      ],
    });

    new cdk.CfnOutput(this, "PhotoBucketName", {
      value: this.photoBucket.bucketName,
      exportName: `scrappr-photo-bucket-${props.stageName}`,
    });

    new cdk.CfnOutput(this, "PhotoBucketRegion", {
      value: this.region,
    });
  }
}
