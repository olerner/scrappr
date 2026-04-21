import { test as base, type Page } from "@playwright/test";
import { authenticateWithCognito, type CognitoTokens } from "./auth";

export const TEST_EMAIL = "test@scrappr.dev";
export const TEST_PASSWORD = "TestPass123!";
export const HAULER_EMAIL = "hauler@scrappr.dev";
export const HAULER_PASSWORD = "TestPass123!";

/**
 * Inject Cognito tokens into localStorage so the app treats the session as
 * authenticated without going through the sign-in UI.
 */
async function injectAuth(page: Page, tokens: CognitoTokens): Promise<void> {
  // Navigate to the app origin so we can write to its localStorage
  await page.goto("/");
  await page.evaluate((t) => {
    localStorage.setItem("scrappr_access_token", t.accessToken);
    localStorage.setItem("scrappr_id_token", t.idToken);
    localStorage.setItem("scrappr_refresh_token", t.refreshToken);
    localStorage.setItem("scrappr_email", t.email);
    localStorage.setItem("scrappr_auth_source", "oauth");
  }, tokens);
}

type AuthFixtures = {
  /** Page already signed in as the scrappee test account */
  authedPage: Page;
  /** Sign in as a specific user and return the page (navigated to "/") */
  signInAs: (email: string, password: string) => Promise<Page>;
};

export const test = base.extend<AuthFixtures>({
  authedPage: async ({ page }, use) => {
    const tokens = await authenticateWithCognito(TEST_EMAIL, TEST_PASSWORD);
    await injectAuth(page, tokens);
    await use(page);
  },

  signInAs: async ({ page }, use) => {
    const fn = async (email: string, password: string) => {
      const tokens = await authenticateWithCognito(email, password);
      await injectAuth(page, tokens);
      return page;
    };
    await use(fn);
  },
});

export { expect } from "@playwright/test";
