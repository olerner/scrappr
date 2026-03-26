import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as ses from "aws-cdk-lib/aws-ses";
import type { Construct } from "constructs";

interface EmailStackProps extends cdk.StackProps {
  stageName: string;
  domainName: string;
}

export class EmailStack extends cdk.Stack {
  public readonly senderEmail: string;
  public readonly sendEmailPolicyStatement: iam.PolicyStatement;

  constructor(scope: Construct, id: string, props: EmailStackProps) {
    super(scope, id, props);

    const { domainName } = props;
    this.senderEmail = `noreply@${domainName}`;

    // ── Route 53 Hosted Zone ──────────────────────────────────────────

    const hostedZone = route53.HostedZone.fromLookup(this, "Zone", {
      domainName,
    });

    // ── SES Domain Identity ───────────────────────────────────────────

    const identity = new ses.EmailIdentity(this, "DomainIdentity", {
      identity: ses.Identity.publicHostedZone(hostedZone),
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
  }
}
