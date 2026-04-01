import * as cdk from "aws-cdk-lib";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as cw_actions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as route53 from "aws-cdk-lib/aws-route53";
import type * as sns from "aws-cdk-lib/aws-sns";
import type { Construct } from "constructs";

interface MonitoringStackProps extends cdk.StackProps {
  stageName: string;
  domainName: string;
  alertTopic: sns.ITopic;
}

export class MonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    const { stageName, domainName, alertTopic } = props;

    // ── Route 53 Health Check ─────────────────────────────────────

    const healthCheck = new route53.CfnHealthCheck(this, "SiteHealthCheck", {
      healthCheckConfig: {
        fullyQualifiedDomainName: domainName,
        port: 443,
        type: "HTTPS",
        resourcePath: "/",
        requestInterval: 30,
        failureThreshold: 3,
      },
      healthCheckTags: [{ key: "Name", value: `scrappr-site-${stageName}` }],
    });

    // ── CloudWatch Alarm ──────────────────────────────────────────
    // Route53 health check metrics are always in us-east-1.

    const alarm = new cloudwatch.Alarm(this, "SiteDownAlarm", {
      alarmName: `scrappr-site-down-${stageName}`,
      alarmDescription: `${domainName} is unreachable`,
      metric: new cloudwatch.Metric({
        namespace: "AWS/Route53",
        metricName: "HealthCheckStatus",
        dimensionsMap: { HealthCheckId: healthCheck.attrHealthCheckId },
        statistic: "Minimum",
        period: cdk.Duration.minutes(1),
      }),
      threshold: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      evaluationPeriods: 3,
      treatMissingData: cloudwatch.TreatMissingData.BREACHING,
    });

    alarm.addAlarmAction(new cw_actions.SnsAction(alertTopic));
    alarm.addOkAction(new cw_actions.SnsAction(alertTopic));
  }
}
