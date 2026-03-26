import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const ses = new SESClient({});
const SENDER = process.env.SENDER_EMAIL || "noreply@scrappr.trevor.fail";

/**
 * Send a transactional email via SES.
 *
 * @param {object} opts
 * @param {string} opts.to - Recipient email address
 * @param {string} opts.subject - Email subject line
 * @param {string} opts.html - HTML body
 * @param {string} [opts.text] - Plain text body (auto-generated from html if omitted)
 */
export async function sendEmail({ to, subject, html, text }) {
  const command = new SendEmailCommand({
    Source: SENDER,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject },
      Body: {
        Html: { Data: html },
        Text: { Data: text || html.replace(/<[^>]*>/g, "") },
      },
    },
  });

  await ses.send(command);
}
