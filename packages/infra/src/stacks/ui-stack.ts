import { existsSync, mkdirSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
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
  /** Managed domain name — hosted zone looked up in this account */
  domainName?: string;
  /** Additional domain aliases (unmanaged — user handles DNS externally) */
  additionalDomains?: string[];
}

export class UiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: UiStackProps) {
    super(scope, id, props);

    const { envName, domainName, additionalDomains = [] } = props;
    const isPreview = envName.startsWith("pr-");
    const allDomains = [...(domainName ? [domainName] : []), ...additionalDomains];

    // ── S3 Bucket (private — CloudFront uses OAC) ─────────────────────

    const bucket = new s3.Bucket(this, "UiBucket", {
      removalPolicy: isPreview ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: isPreview,
    });

    // ── Route 53 Hosted Zone (lookup existing) ────────────────────────

    let hostedZone: route53.IHostedZone | undefined;
    if (domainName) {
      hostedZone = route53.HostedZone.fromLookup(this, "Zone", {
        domainName,
      });
    }

    // ── ACM Certificate ───────────────────────────────────────────────

    let certificate: acm.ICertificate | undefined;
    if (domainName && hostedZone) {
      // Only auto-validate the managed domain; unmanaged domains require manual DNS validation
      const validationZones: Record<string, route53.IHostedZone> = { [domainName]: hostedZone };
      certificate = new acm.Certificate(this, "Certificate", {
        domainName,
        subjectAlternativeNames: additionalDomains.length > 0 ? additionalDomains : undefined,
        validation: acm.CertificateValidation.fromDnsMultiZone(validationZones),
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
            "img-src 'self' data: blob: https://*.amazonaws.com https://*.tile.openstreetmap.org",
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
      ...(certificate && allDomains.length > 0 ? { certificate, domainNames: allDomains } : {}),
    });

    // ── Route 53 A Record ─────────────────────────────────────────────

    if (hostedZone && domainName) {
      new route53.ARecord(this, "AliasRecord", {
        zone: hostedZone,
        target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
      });
    }

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

    if (allDomains.length > 0) {
      new cdk.CfnOutput(this, "CustomDomains", {
        value: allDomains.map((d) => `https://${d}`).join(", "),
      });
    }

    for (const domain of additionalDomains) {
      new cdk.CfnOutput(this, `ManualDns-${domain.replace(/\./g, "-")}`, {
        value: `Add CNAME: ${domain} → ${distribution.distributionDomainName}`,
        description: `Manual DNS setup needed for ${domain}`,
      });
    }
  }
}
