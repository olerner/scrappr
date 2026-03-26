import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const ses = new SESClient({});
const cognito = new CognitoIdentityProviderClient({});
const SENDER = process.env.SENDER_EMAIL || "noreply@scrappr.trevor.fail";
const USER_POOL_ID = process.env.USER_POOL_ID;

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
  if (!SENDER || !to) return;

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

/**
 * Look up a user's email from Cognito by their sub (userId).
 * Returns null if lookup fails or email not found.
 */
export async function getUserEmail(userId) {
  if (!USER_POOL_ID) return null;
  try {
    const result = await cognito.send(
      new AdminGetUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: userId,
      })
    );
    const emailAttr = result.UserAttributes?.find((a) => a.Name === "email");
    return emailAttr?.Value || null;
  } catch {
    return null;
  }
}

/**
 * Send a listing notification email to the scrappee (listing owner).
 * Silently fails if email can't be sent (non-critical path).
 */
export async function notifyScrappee({ ownerUserId, subject, heading, message, listing }) {
  try {
    const email = await getUserEmail(ownerUserId);
    if (!email) return;

    const html = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #059669; font-size: 24px; margin: 0;">Scrappr</h1>
        </div>
        <div style="background: #f9fafb; border-radius: 12px; padding: 24px;">
          <h2 style="color: #111827; font-size: 18px; margin: 0 0 8px;">${heading}</h2>
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 16px;">${message}</p>
          <div style="background: white; border-radius: 8px; padding: 16px; border: 1px solid #e5e7eb;">
            <p style="margin: 0 0 4px; font-weight: 600; color: #111827;">${listing.category}</p>
            <p style="margin: 0; color: #6b7280; font-size: 13px;">${listing.description || ""}</p>
          </div>
        </div>
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
          Scrappr &mdash; Your scrap. Their hustle. Zero waste.
        </p>
      </div>
    `;

    await sendEmail({ to: email, subject, html });
  } catch {
    // Email is non-critical — don't fail the request
  }
}
