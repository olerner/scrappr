import {
  AdminSetUserPasswordCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import { GetObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { expect, test } from "@playwright/test";

const TEST_EMAIL = "testuser1@scrappr.trevor.fail";
const ORIGINAL_PASSWORD = "TestPass123!";
const TEMP_PASSWORD = "TempResetPass456!";
const INBOX_BUCKET = "scrappr-inbox-dev";
const INBOX_PREFIX = "incoming/";
const USER_POOL_ID = process.env.USER_POOL_ID || "us-east-1_N45oIsOs3";

const s3 = new S3Client({ region: "us-east-1" });
const cognito = new CognitoIdentityProviderClient({ region: "us-east-1" });

/**
 * Poll S3 for a verification email sent to the given address after the given
 * timestamp, and extract the 6-digit code from the HTML body.
 */
async function getVerificationCodeFromS3(
  recipientEmail: string,
  afterTimestamp: Date,
): Promise<string> {
  const maxAttempts = 15;
  const intervalMs = 2_000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const listResult = await s3.send(
      new ListObjectsV2Command({ Bucket: INBOX_BUCKET, Prefix: INBOX_PREFIX }),
    );

    const candidates = (listResult.Contents ?? [])
      .filter((obj) => obj.LastModified && obj.LastModified > afterTimestamp)
      .sort((a, b) => b.LastModified!.getTime() - a.LastModified!.getTime());

    for (const obj of candidates) {
      const getResult = await s3.send(new GetObjectCommand({ Bucket: INBOX_BUCKET, Key: obj.Key }));
      const body = await getResult.Body!.transformToString();

      if (!body.includes(recipientEmail)) continue;

      const match = body.match(/letter-spacing:\s*4px[^>]*>(\d{6})<\/span>/);
      if (match) return match[1];
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error(
    `No verification email found for ${recipientEmail} after ${maxAttempts} attempts`,
  );
}

test.describe("Forgot Password Flow", () => {
  test.afterEach(async () => {
    // Restore the original password so the test is idempotent
    await cognito.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: USER_POOL_ID,
        Username: TEST_EMAIL,
        Password: ORIGINAL_PASSWORD,
        Permanent: true,
      }),
    );
  });

  test("reset password via email verification code", async ({ page }) => {
    const beforeReset = new Date();

    // 1. Navigate to forgot password page
    await page.goto("/forgot-password");
    await expect(page.getByText("Reset Your Password")).toBeVisible();

    // 2. Request reset code
    await page.getByPlaceholder("you@example.com").fill(TEST_EMAIL);
    await page.getByRole("button", { name: "Send Reset Code" }).click();

    // 3. Wait for step 2 UI
    await expect(page.getByText("Verification Code")).toBeVisible({ timeout: 15_000 });

    // 4. Read verification code from S3 inbox
    const code = await getVerificationCodeFromS3(TEST_EMAIL, beforeReset);

    // 5. Enter code and new password
    await page.getByPlaceholder("123456").fill(code);
    await page.getByPlaceholder("••••••••").fill(TEMP_PASSWORD);
    await page.getByRole("button", { name: "Reset Password" }).click();

    // 6. Expect auto-sign-in to redirect to /list
    await expect(page.getByText("Your Listings")).toBeVisible({ timeout: 15_000 });

    // 7. Sign out and verify sign-in with new password works
    await page.goto("/signed-out");
    await expect(page.getByText("You've been signed out")).toBeVisible();

    await page.goto("/list");
    await expect(page.getByText("Sign In to Scrappr")).toBeVisible();
    await page.getByPlaceholder("you@example.com").fill(TEST_EMAIL);
    await page.getByPlaceholder("••••••••").fill(TEMP_PASSWORD);
    await page.getByRole("button", { name: "Sign In", exact: true }).click();
    await expect(page.getByText("Your Listings")).toBeVisible({ timeout: 15_000 });
  });
});
