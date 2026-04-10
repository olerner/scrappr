import {
  CloudWatchLogsClient,
  StartQueryCommand,
  GetQueryResultsCommand,
  DescribeLogGroupsCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

const logs = new CloudWatchLogsClient({});
const ses = new SESv2Client({});

const SENDER_EMAIL = process.env.SENDER_EMAIL;
const ALERT_RECIPIENTS = (process.env.ALERT_RECIPIENTS || "").split(",").filter(Boolean);
const STAGE_NAME = process.env.STAGE_NAME || "unknown";

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Resolve the CloudWatch log group for an alarm.
 *
 * Invocation-error alarms include FunctionName in Trigger.Dimensions.
 * App-error alarms use a custom metric — we extract the construct ID from the
 * alarm name and search DescribeLogGroups for a matching log group.
 */
async function resolveLogGroup(alarmMessage) {
  const { AlarmName, Trigger } = alarmMessage;

  // Strategy 1: extract FunctionName from Trigger.Dimensions (invocation-error alarms)
  if (Trigger?.Dimensions?.length) {
    for (const dim of Trigger.Dimensions) {
      const name = dim.name || dim.Name;
      const value = dim.value || dim.Value;
      if (name === "FunctionName" && value) {
        return `/aws/lambda/${value}`;
      }
    }
  }

  // Strategy 2: derive construct ID from alarm name and search log groups
  // Alarm names look like: scrappr-CreateListing-app-errors-dev or scrappr-CreateListing-errors-dev
  const match = AlarmName?.match(/^scrappr-(.+?)(?:-app)?-errors-.+$/);
  if (!match) return null;

  const constructId = match[1];
  let nextToken;

  do {
    const resp = await logs.send(
      new DescribeLogGroupsCommand({
        logGroupNamePrefix: "/aws/lambda/",
        nextToken,
      }),
    );

    for (const lg of resp.logGroups || []) {
      if (lg.logGroupName.includes(constructId)) {
        return lg.logGroupName;
      }
    }

    nextToken = resp.nextToken;
  } while (nextToken);

  return null;
}

/**
 * Run a Logs Insights query and poll for results with exponential backoff.
 */
async function queryLogs(logGroup, aroundTime) {
  const windowMs = 10 * 60 * 1000;
  const center = new Date(aroundTime).getTime();
  const startTime = Math.floor((center - windowMs) / 1000);
  const endTime = Math.floor((center + windowMs) / 1000);

  const { queryId } = await logs.send(
    new StartQueryCommand({
      logGroupName: logGroup,
      startTime,
      endTime,
      queryString: `fields @timestamp, @message
| filter @message like /ERROR/ or @message like /"level":\\s*"ERROR"/
| sort @timestamp desc
| limit 50`,
    }),
  );

  let delay = 500;
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay * 2, 4000);

    const resp = await logs.send(new GetQueryResultsCommand({ queryId }));

    if (resp.status === "Complete") {
      return (resp.results || []).map((row) => {
        const obj = {};
        for (const field of row) {
          obj[field.field] = field.value;
        }
        return obj;
      });
    }

    if (resp.status === "Failed" || resp.status === "Cancelled") {
      console.error(`Logs Insights query ${resp.status}`);
      return [];
    }
  }

  console.error("Logs Insights query timed out after 30s");
  return [];
}

function buildHtml(alarmName, stateChangeTime, reason, logGroup, logLines) {
  let logsSection;

  if (!logGroup) {
    logsSection = `<p style="color:#f59e0b;">Could not determine log group for this alarm.</p>`;
  } else if (logLines.length === 0) {
    logsSection = `<p style="color:#6b7280;">No ERROR-level logs found in the &plusmn;10-minute window.</p>`;
  } else {
    const raw = logLines
      .map((l) => `[${l["@timestamp"] || ""}] ${l["@message"] || ""}`)
      .join("\n");
    const truncated = raw.length > 100_000 ? `${raw.slice(0, 100_000)}\n\n... truncated ...` : raw;

    logsSection = `<pre style="background:#1e1e2e;color:#cdd6f4;padding:16px;border-radius:8px;font-size:12px;overflow-x:auto;white-space:pre-wrap;word-break:break-all;">${escapeHtml(truncated)}</pre>`;
  }

  return `
<div style="font-family:system-ui,-apple-system,sans-serif;max-width:720px;margin:0 auto;padding:24px;">
  <h1 style="color:#dc2626;font-size:20px;margin:0 0 16px;">Alarm: ${escapeHtml(alarmName)}</h1>
  <table style="border-collapse:collapse;width:100%;margin-bottom:24px;font-size:14px;">
    <tr><td style="padding:6px 12px;font-weight:600;color:#374151;">Time</td><td style="padding:6px 12px;color:#6b7280;">${escapeHtml(stateChangeTime)}</td></tr>
    <tr><td style="padding:6px 12px;font-weight:600;color:#374151;">Log Group</td><td style="padding:6px 12px;color:#6b7280;">${logGroup ? escapeHtml(logGroup) : "N/A"}</td></tr>
    <tr><td style="padding:6px 12px;font-weight:600;color:#374151;">Reason</td><td style="padding:6px 12px;color:#6b7280;">${escapeHtml(reason)}</td></tr>
  </table>
  <h2 style="font-size:16px;color:#111827;margin:0 0 12px;">Error Logs</h2>
  ${logsSection}
  <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:24px;">Scrappr AlertDigest &middot; ${escapeHtml(STAGE_NAME)}</p>
</div>`;
}

export async function handler(event) {
  for (const record of event.Records) {
    let alarmMessage;
    try {
      alarmMessage = JSON.parse(record.Sns.Message);
    } catch (err) {
      console.error("Failed to parse SNS message:", err);
      continue;
    }

    const alarmName = alarmMessage.AlarmName || "Unknown Alarm";
    const stateChangeTime = alarmMessage.StateChangeTime || new Date().toISOString();
    const reason = alarmMessage.NewStateReason || "";

    let logGroup = null;
    let logLines = [];

    try {
      logGroup = await resolveLogGroup(alarmMessage);
    } catch (err) {
      console.error("Failed to resolve log group:", err);
    }

    if (logGroup) {
      try {
        logLines = await queryLogs(logGroup, stateChangeTime);
      } catch (err) {
        console.error("Failed to query logs:", err);
      }
    }

    const html = buildHtml(alarmName, stateChangeTime, reason, logGroup, logLines);
    const text = `Alarm: ${alarmName}\nTime: ${stateChangeTime}\nLog Group: ${logGroup || "N/A"}\nReason: ${reason}\n\n${
      logLines.length
        ? logLines.map((l) => `[${l["@timestamp"] || ""}] ${l["@message"] || ""}`).join("\n")
        : "No error logs found."
    }`;

    try {
      await ses.send(
        new SendEmailCommand({
          FromEmailAddress: SENDER_EMAIL,
          Destination: { ToAddresses: ALERT_RECIPIENTS },
          Content: {
            Simple: {
              Subject: { Data: `[Scrappr ${STAGE_NAME}] ${alarmName}` },
              Body: {
                Html: { Data: html },
                Text: { Data: text },
              },
            },
          },
        }),
      );
    } catch (err) {
      console.error("Failed to send alert email:", err);
    }
  }
}
