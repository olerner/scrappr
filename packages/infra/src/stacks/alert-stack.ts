import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subs from "aws-cdk-lib/aws-sns-subscriptions";
import type { Construct } from "constructs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface AlertStackProps extends cdk.StackProps {
  stageName: string;
  senderEmail: string;
  sendEmailPolicy: iam.PolicyStatement;
}

export class AlertStack extends cdk.Stack {
  public readonly alertTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: AlertStackProps) {
    super(scope, id, props);

    const { stageName, senderEmail, sendEmailPolicy } = props;

    // ── SNS Alert Topic ───────────────────────────────────────────

    this.alertTopic = new sns.Topic(this, "AlertTopic", {
      topicName: `scrappr-alerts-${stageName}`,
    });

    this.alertTopic.addSubscription(new subs.EmailSubscription("trevbot@trevor.fail"));
    this.alertTopic.addSubscription(new subs.EmailSubscription("trevorlitsey@gmail.com"));

    // ── Alert Digest Lambda ─────────────────────────────────────────
    // Subscribes to the alert topic, pulls actual error logs from
    // CloudWatch Logs Insights, and sends an enriched email via SES.

    const lambdasDir = path.join(__dirname, "../lambdas");

    const alertDigestFn = new lambda.Function(this, "AlertDigestFn", {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset(lambdasDir),
      handler: "alert-digest.handler",
      timeout: cdk.Duration.seconds(60),
      environment: {
        SENDER_EMAIL: senderEmail,
        ALERT_RECIPIENTS: "trevbot@trevor.fail,trevorlitsey@gmail.com",
        STAGE_NAME: stageName,
      },
    });

    alertDigestFn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["logs:StartQuery", "logs:GetQueryResults", "logs:DescribeLogGroups"],
        resources: ["*"],
      }),
    );

    alertDigestFn.addToRolePolicy(sendEmailPolicy);

    this.alertTopic.addSubscription(new subs.LambdaSubscription(alertDigestFn));
  }
}
