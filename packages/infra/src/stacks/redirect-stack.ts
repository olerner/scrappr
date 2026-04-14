import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as s3 from "aws-cdk-lib/aws-s3";
import type { Construct } from "constructs";

interface RedirectStackProps extends cdk.StackProps {
  /** The domain to redirect FROM (must have a Route 53 hosted zone) */
  fromDomain: string;
  /** The domain to redirect TO */
  toDomain: string;
}

export class RedirectStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: RedirectStackProps) {
    super(scope, id, props);

    const { fromDomain, toDomain } = props;

    // ── Route 53 Hosted Zone ──────────────────────────────────────────

    const hostedZone = route53.HostedZone.fromLookup(this, "Zone", {
      domainName: fromDomain,
    });

    // ── S3 Bucket (redirect-only, no content) ─────────────────────────

    const bucket = new s3.Bucket(this, "RedirectBucket", {
      websiteRedirect: {
        hostName: toDomain,
        protocol: s3.RedirectProtocol.HTTPS,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // ── ACM Certificate ───────────────────────────────────────────────

    const certificate = new acm.Certificate(this, "Certificate", {
      domainName: fromDomain,
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });

    // ── CloudFront Distribution ───────────────────────────────────────

    const distribution = new cloudfront.Distribution(this, "Distribution", {
      comment: `Redirect ${fromDomain} → ${toDomain}`,
      defaultBehavior: {
        origin: new origins.HttpOrigin(bucket.bucketWebsiteDomainName, {
          protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      certificate,
      domainNames: [fromDomain],
    });

    // ── Route 53 A Record ─────────────────────────────────────────────

    new route53.ARecord(this, "AliasRecord", {
      zone: hostedZone,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
    });
  }
}
