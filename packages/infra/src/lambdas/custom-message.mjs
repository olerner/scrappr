const APP_URL = process.env.APP_URL;

if (!APP_URL) throw new Error("Missing required env var APP_URL");

function wrap(heading, body) {
  return `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <img src="${APP_URL}/scrappy-mascot.png" alt="Scrappy" width="48" height="48" style="border-radius: 50%; margin-bottom: 8px;" />
        <h1 style="color: #059669; font-size: 24px; margin: 0;">Scrappr</h1>
      </div>
      <div style="background: #f9fafb; border-radius: 12px; padding: 24px;">
        <h2 style="color: #111827; font-size: 18px; margin: 0 0 8px;">${heading}</h2>
        ${body}
      </div>
      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
        Scrappr &mdash; Your scrap. Their hustle. Zero waste.
      </p>
    </div>
  `;
}

export async function handler(event) {
  const code = event.request.codeParameter;

  switch (event.triggerSource) {
    case "CustomMessage_SignUp":
      event.response.emailSubject = "Verify your Scrappr account";
      event.response.emailMessage = wrap(
        "Verify your email",
        `<p style="color: #6b7280; font-size: 14px; margin: 0 0 16px;">Enter this code to verify your account:</p>
         <div style="background: white; border-radius: 8px; padding: 16px; border: 1px solid #e5e7eb; text-align: center; margin-bottom: 16px;">
           <span style="font-size: 32px; font-weight: 700; letter-spacing: 4px; color: #059669;">${code}</span>
         </div>
         <p style="color: #9ca3af; font-size: 13px; margin: 0;">If you didn&rsquo;t create a Scrappr account, you can ignore this email.</p>`,
      );
      break;

    case "CustomMessage_ForgotPassword":
      event.response.emailSubject = "Reset your Scrappr password";
      event.response.emailMessage = wrap(
        "Reset your password",
        `<p style="color: #6b7280; font-size: 14px; margin: 0 0 16px;">Enter this code to reset your password:</p>
         <div style="background: white; border-radius: 8px; padding: 16px; border: 1px solid #e5e7eb; text-align: center; margin-bottom: 16px;">
           <span style="font-size: 32px; font-weight: 700; letter-spacing: 4px; color: #059669;">${code}</span>
         </div>
         <p style="color: #9ca3af; font-size: 13px; margin: 0;">If you didn&rsquo;t request a password reset, you can ignore this email.</p>`,
      );
      break;

    case "CustomMessage_ResendCode":
      event.response.emailSubject = "Your Scrappr verification code";
      event.response.emailMessage = wrap(
        "Verify your email",
        `<p style="color: #6b7280; font-size: 14px; margin: 0 0 16px;">Enter this code to verify your account:</p>
         <div style="background: white; border-radius: 8px; padding: 16px; border: 1px solid #e5e7eb; text-align: center; margin-bottom: 16px;">
           <span style="font-size: 32px; font-weight: 700; letter-spacing: 4px; color: #059669;">${code}</span>
         </div>
         <p style="color: #9ca3af; font-size: 13px; margin: 0;">If you didn&rsquo;t create a Scrappr account, you can ignore this email.</p>`,
      );
      break;

    default:
      break;
  }

  return event;
}
