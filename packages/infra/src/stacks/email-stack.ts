import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as ses from "aws-cdk-lib/aws-ses";
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

    const { domainName, hostedZoneDomain } = props;
    this.senderEmail = `noreply@${domainName}`;

    // ── Route 53 Hosted Zone ──────────────────────────────────────────

    const hostedZone = route53.HostedZone.fromLookup(this, "Zone", {
      domainName: hostedZoneDomain,
    });

    // ── SES Domain Identity ───────────────────────────────────────────
    // Verify the subdomain for sending. DNS records (DKIM, SPF) are
    // created in the parent hosted zone automatically.

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
