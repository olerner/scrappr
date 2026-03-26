import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as ses from "aws-cdk-lib/aws-ses";
import * as ses_actions from "aws-cdk-lib/aws-ses-actions";
import type { Construct } from "constructs";

interface EmailStackProps extends cdk.StackProps {
  stageName: string;
  /** The subdomain to send from (e.g. scrappr.trevor.fail) */
  domainName: string;
  /** The parent hosted zone (e.g. trevor.fail) */
  hostedZoneDomain: string;
}

export class EmailStack extends cdk.Stack {
  public readonly senderEmail: string;
  public readonly sendEmailPolicyStatement: iam.PolicyStatement;

  constructor(scope: Construct, id: string, props: EmailStackProps) {
    super(scope, id, props);

    const { stageName, domainName, hostedZoneDomain } = props;
    this.senderEmail = `noreply@${domainName}`;

    // ── Route 53 Hosted Zone ──────────────────────────────────────────

    const hostedZone = route53.HostedZone.fromLookup(this, "Zone", {
      domainName: hostedZoneDomain,
    });

    // ── SES Domain Identity ───────────────────────────────────────────

    const identity = new ses.EmailIdentity(this, "DomainIdentity", {
      identity: ses.Identity.domain(domainName),
    });

    // Add DKIM CNAME records to the parent hosted zone
    for (let i = 1; i <= 3; i++) {
      new route53.CnameRecord(this, `DkimRecord${i}`, {
        zone: hostedZone,
        recordName: identity.dkimRecords[i - 1].name,
        domainName: identity.dkimRecords[i - 1].value,
      });
    }

    // ── MX Record for receiving ───────────────────────────────────────

    new route53.MxRecord(this, "MxRecord", {
      zone: hostedZone,
      recordName: domainName,
      values: [
        {
          priority: 10,
          hostName: `inbound-smtp.${this.region}.amazonaws.com`,
        },
      ],
    });

    // ── S3 Bucket for incoming emails ─────────────────────────────────

    const inboxBucket = new s3.Bucket(this, "InboxBucket", {
      bucketName: `scrappr-inbox-${stageName}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [{ expiration: cdk.Duration.days(30) }],
    });

    // SES needs permission to put objects in the bucket
    inboxBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ["s3:PutObject"],
        resources: [inboxBucket.arnForObjects("*")],
        principals: [new iam.ServicePrincipal("ses.amazonaws.com")],
        conditions: {
          StringEquals: { "AWS:SourceAccount": this.account },
        },
      }),
    );

    // ── SES Receipt Rule Set ──────────────────────────────────────────

    const ruleSet = new ses.ReceiptRuleSet(this, "InboxRuleSet", {
      receiptRuleSetName: `scrappr-inbox-${stageName}`,
    });

    ruleSet.addRule("CatchAll", {
      recipients: [domainName],
      actions: [
        new ses_actions.S3({
          bucket: inboxBucket,
          objectKeyPrefix: "incoming/",
        }),
      ],
    });

    // ── IAM Policy for sending ────────────────────────────────────────

    this.sendEmailPolicyStatement = new iam.PolicyStatement({
      actions: ["ses:SendEmail", "ses:SendRawEmail"],
      resources: [`arn:aws:ses:${this.region}:${this.account}:identity/${domainName}`],
    });

    // ── Outputs ───────────────────────────────────────────────────────

    new cdk.CfnOutput(this, "SenderEmail", {
      value: this.senderEmail,
    });

    new cdk.CfnOutput(this, "IdentityArn", {
      value: identity.emailIdentityArn,
    });

    new cdk.CfnOutput(this, "InboxBucket", {
      value: inboxBucket.bucketName,
    });
  }
}
