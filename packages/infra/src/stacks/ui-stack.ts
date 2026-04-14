import { existsSync, mkdirSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import type { Construct } from "constructs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UI_DIST_PATH = path.join(__dirname, "../../../ui/dist");

// Ensure dist directory exists so CDK synth works even without a build (e.g. cdk destroy)
if (!existsSync(UI_DIST_PATH)) {
  mkdirSync(UI_DIST_PATH, { recursive: true });
}

interface UiStackProps extends cdk.StackProps {
  envName: string;
  /** Custom domain aliases — DNS managed externally via Spaceship. ACM cert validation records are synced by sync-spaceship-dns.mjs during deploy. */
  domains?: string[];
}

export class UiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: UiStackProps) {
    super(scope, id, props);

    const { envName, domains = [] } = props;
    const isPreview = envName.startsWith("pr-");

    // ── S3 Bucket (private — CloudFront uses OAC) ─────────────────────

    const bucket = new s3.Bucket(this, "UiBucket", {
      removalPolicy: isPreview ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: isPreview,
    });

    // ── ACM Certificate ───────────────────────────────────────────────
    // DNS validation records are pushed to Spaceship by sync-spaceship-dns.mjs
    // which runs in parallel during deploy (via deploy-env.mjs or the CI workflow).

    let certificate: acm.ICertificate | undefined;
    if (domains.length > 0) {
      certificate = new acm.Certificate(this, "Certificate", {
        domainName: domains[0],
        subjectAlternativeNames: domains.length > 1 ? domains.slice(1) : undefined,
        validation: acm.CertificateValidation.fromDns(),
      });
    }

    // ── Security Headers ──────────────────────────────────────────────

    const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(this, "SecurityHeaders", {
      responseHeadersPolicyName: `scrappr-security-headers-${envName}`,
      securityHeadersBehavior: {
        strictTransportSecurity: {
          accessControlMaxAge: cdk.Duration.days(365),
          includeSubdomains: true,
          preload: true,
          override: true,
        },
        contentSecurityPolicy: {
          contentSecurityPolicy: [
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: https://*.amazonaws.com https://*.cloudfront.net https://*.tile.openstreetmap.org",
            "font-src 'self'",
            "connect-src 'self' https://*.execute-api.us-east-1.amazonaws.com https://*.amazonaws.com https://*.amazoncognito.com https://places.googleapis.com https://cognito-idp.us-east-1.amazonaws.com",
            "frame-ancestors 'none'",
          ].join("; "),
          override: true,
        },
        contentTypeOptions: { override: true },
        frameOptions: {
          frameOption: cloudfront.HeadersFrameOption.DENY,
          override: true,
        },
        referrerPolicy: {
          referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
          override: true,
        },
      },
    });

    // ── CloudFront Distribution ───────────────────────────────────────

    const distribution = new cloudfront.Distribution(this, "Distribution", {
      comment: `Scrappr UI (${envName})`,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        compress: true,
        responseHeadersPolicy,
      },
      defaultRootObject: "index.html",
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: cdk.Duration.seconds(0),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: cdk.Duration.seconds(0),
        },
      ],
      ...(certificate && domains.length > 0 ? { certificate, domainNames: domains } : {}),
    });

    // ── Deploy UI Files ───────────────────────────────────────────────

    new s3deploy.BucketDeployment(this, "DeployUi", {
      sources: [s3deploy.Source.asset(UI_DIST_PATH)],
      destinationBucket: bucket,
      distribution,
      distributionPaths: ["/*"],
    });

    // ── Outputs ───────────────────────────────────────────────────────

    new cdk.CfnOutput(this, "CloudFrontUrl", {
      value: `https://${distribution.distributionDomainName}`,
    });

    new cdk.CfnOutput(this, "DistributionId", {
      value: distribution.distributionId,
    });

    // Plain hostname (no scheme) — consumed by sync-spaceship-dns.mjs to build CNAMEs
    new cdk.CfnOutput(this, "DistributionDomain", {
      value: distribution.distributionDomainName,
    });

    if (certificate) {
      // Cert ARN — consumed by sync-spaceship-dns.mjs to fetch validation records via ACM
      new cdk.CfnOutput(this, "CertificateArn", {
        value: certificate.certificateArn,
      });
    }

    if (domains.length > 0) {
      // Comma-separated list — consumed by sync-spaceship-dns.mjs to know which CNAMEs to create
      new cdk.CfnOutput(this, "AdditionalDomains", {
        value: domains.join(","),
      });

      new cdk.CfnOutput(this, "CustomDomains", {
        value: domains.map((d) => `https://${d}`).join(", "),
      });
    }
  }
}
