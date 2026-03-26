import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const ses = new SESClient({});
const cognito = new CognitoIdentityProviderClient({});
const SENDER = process.env.SENDER_EMAIL || "noreply@scrappr.trevor.fail";
const USER_POOL_ID = process.env.USER_POOL_ID;
const APP_URL = process.env.APP_URL || "https://scrappr.trevor.fail";

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
 *
 * @param {object} opts
 * @param {string} opts.ownerUserId - Cognito user ID of the listing owner
 * @param {string} opts.subject - Email subject
 * @param {string} opts.heading - Email heading
 * @param {string} opts.message - Email body text
 * @param {object} opts.listing - Listing object (needs category, description)
 * @param {string} [opts.linkPath="/list"] - Path to link to (e.g. "/list", "/haul")
 */
export async function notifyScrappee({ ownerUserId, subject, heading, message, listing, linkPath = "/list" }) {
  try {
    const email = await getUserEmail(ownerUserId);
    if (!email) return;

    const link = `${APP_URL}${linkPath}`;

    const html = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="${APP_URL}/scrappy-mascot.png" alt="Scrappy" width="48" height="48" style="border-radius: 50%; margin-bottom: 8px;" />
          <h1 style="color: #059669; font-size: 24px; margin: 0;">Scrappr</h1>
        </div>
        <div style="background: #f9fafb; border-radius: 12px; padding: 24px;">
          <h2 style="color: #111827; font-size: 18px; margin: 0 0 8px;">${heading}</h2>
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 16px;">${message}</p>
          <div style="background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; margin-bottom: 16px;">
            ${listing.photoUrl ? `<img src="${listing.photoUrl}" alt="${listing.category}" width="100%" style="display: block; max-height: 200px; object-fit: cover;" />` : ""}
            <div style="padding: 16px;">
              <p style="margin: 0 0 4px; font-weight: 600; color: #111827;">${listing.category}</p>
              <p style="margin: 0; color: #6b7280; font-size: 13px;">${listing.description || ""}</p>
            </div>
          </div>
          <a href="${link}" style="display: inline-block; background: #059669; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
            View in Scrappr
          </a>
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
