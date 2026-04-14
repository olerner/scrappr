import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as ses from "aws-cdk-lib/aws-ses";
import * as ses_actions from "aws-cdk-lib/aws-ses-actions";
import * as cr from "aws-cdk-lib/custom-resources";
import type { Construct } from "constructs";

interface EmailStackProps extends cdk.StackProps {
  stageName: string;
  /** The domain to send from (e.g. dev.scrappr.io, scrappr.io) */
  domainName: string;
  /** Enable inbound email receiving (S3 inbox + SES receipt rules). MX record must be configured externally in Spaceship DNS. */
  enableInbound?: boolean;
}

export class EmailStack extends cdk.Stack {
  public readonly senderEmail: string;
  public readonly sendEmailPolicyStatement: iam.PolicyStatement;

  constructor(scope: Construct, id: string, props: EmailStackProps) {
    super(scope, id, props);

    const { stageName, domainName, enableInbound = false } = props;
    this.senderEmail = `noreply@${domainName}`;

    // ── SES Domain Identity ───────────────────────────────────────────
    // DKIM CNAME records must be configured manually in Spaceship DNS.

    const identity = new ses.EmailIdentity(this, "DomainIdentity", {
      identity: ses.Identity.domain(domainName),
    });

    // ── Inbound email (optional) ────────────────────────────────────

    if (enableInbound) {
      // MX record must be configured externally in Spaceship DNS:
      //   name: <subdomain>  type: MX  value: 10 inbound-smtp.us-east-1.amazonaws.com

      const inboxBucket = new s3.Bucket(this, "InboxBucket", {
        bucketName: `scrappr-email-inbox-${stageName}`,
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

      // ── SES Receipt Rule Set ──────────────────────────────────────

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

      // Activate the receipt rule set (SES allows only one active at a time)
      new cr.AwsCustomResource(this, "ActivateRuleSet", {
        onCreate: {
          service: "SES",
          action: "setActiveReceiptRuleSet",
          parameters: { RuleSetName: ruleSet.receiptRuleSetName },
          physicalResourceId: cr.PhysicalResourceId.of("activate-inbox-ruleset"),
        },
        onUpdate: {
          service: "SES",
          action: "setActiveReceiptRuleSet",
          parameters: { RuleSetName: ruleSet.receiptRuleSetName },
          physicalResourceId: cr.PhysicalResourceId.of("activate-inbox-ruleset"),
        },
        onDelete: {
          service: "SES",
          action: "setActiveReceiptRuleSet",
          parameters: {},
        },
        policy: cr.AwsCustomResourcePolicy.fromStatements([
          new iam.PolicyStatement({
            actions: ["ses:SetActiveReceiptRuleSet"],
            resources: ["*"],
          }),
        ]),
      });

      new cdk.CfnOutput(this, "InboxBucketName", {
        value: inboxBucket.bucketName,
      });
    }

    // ── IAM Policy for sending ────────────────────────────────────────

    this.sendEmailPolicyStatement = new iam.PolicyStatement({
      actions: ["ses:SendEmail", "ses:SendRawEmail"],
      resources: [`arn:aws:ses:${this.region}:${this.account}:identity/*`],
    });

    // ── Outputs ───────────────────────────────────────────────────────

    new cdk.CfnOutput(this, "SenderEmail", {
      value: this.senderEmail,
    });

    new cdk.CfnOutput(this, "IdentityArn", {
      value: identity.emailIdentityArn,
    });
  }
}
