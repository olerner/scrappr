/**
 * Scrappr full QA suite — based on wiki @ https://github.com/olerner/scrappr/wiki/QA-Testing
 * Target: https://scrappr.trevor.fail
 */
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const BASE = "https://scrappr.trevor.fail";
const PASSWORD = "TestPass123!";

// Test accounts from wiki
const LISTER1 = "testuser1@scrappr.trevor.fail";
const LISTER2 = "testuser2@scrappr.trevor.fail";
const HAULER3 = "testuser3@scrappr.trevor.fail";

// Track created listing IDs per test for cleanup
const testContext = new Map<string, string[]>();

// Helper: mock Google Places for a given zip
async function mockPlaces(page: Page, zip: string, placeId = "ChIJMockPlace001") {
  await page.route("**/places.googleapis.com/v1/places:autocomplete**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        suggestions: [
          {
            placePrediction: {
              text: { text: `123 Mock St, St Louis Park, MN ${zip}, USA` },
              placeId,
            },
          },
        ],
      }),
    });
  });
  await page.route(`**/places.googleapis.com/v1/places/${placeId}**`, (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        location: { latitude: 44.9298, longitude: -93.3477 },
        formattedAddress: `123 Mock St, St Louis Park, MN ${zip}, USA`,
        addressComponents: [
          { types: ["street_number"], shortText: "123" },
          { types: ["route"], shortText: "Mock St" },
          { types: ["locality"], shortText: "St Louis Park" },
          { types: ["administrative_area_level_1"], shortText: "MN" },
          { types: ["postal_code"], shortText: zip },
          { types: ["country"], shortText: "US" },
        ],
      }),
    });
  });
}

// Helper: sign in using the existing test account (TestPass123!)
async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.goto(`${BASE}/list`);
  await expect(page.getByText("Sign In to Scrappr")).toBeVisible({ timeout: 15_000 });
  await page.getByPlaceholder("you@example.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  // Dashboard heading is "Your Listings" (not "My Listings")
  await expect(page.getByText("Your Listings")).toBeVisible({ timeout: 20_000 });
}

// Helper: set up listing creation tracking for a page context
async function setupListingTracking(page: Page, testName: string) {
  if (!testContext.has(testName)) {
    testContext.set(testName, []);
  }
  const createdListings = testContext.get(testName)!;

  // Intercept POST /api/listings to capture created listing IDs
  await page.route(`${BASE}/api/listings`, async (route) => {
    // Only intercept POST requests (create listing)
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    const response = await route.fetch();
    
    // Capture the listing ID from the response
    if (response.ok()) {
      try {
        const json = await response.json();
        if (json.listingId) {
          createdListings.push(json.listingId);
        }
      } catch {
        // ignore parse errors
      }
    }
    
    // Fulfill the request with the fetched response
    await route.fulfill({ response });
  });
}

// Helper: clean up all listings created during a test
async function cleanupCreatedListings(page: Page, testName: string) {
  const createdListings = testContext.get(testName);
  if (!createdListings || createdListings.length === 0) {
    return;
  }

  for (const listingId of createdListings) {
    try {
      const response = await page.request.delete(`${BASE}/api/listings/${listingId}`, {
        failOnStatusCode: false,
      });
      if (!response.ok()) {
        console.warn(`Failed to delete listing ${listingId}: ${response.status()}`);
      }
    } catch (err) {
      console.warn(`Error deleting listing ${listingId}:`, err);
    }
  }

  // Clear the list after cleanup
  testContext.delete(testName);
}

const TEST_EMAIL = "test@scrappr.dev";

// Global test hook: set up listing tracking before each test and clean up after
test.beforeEach(async ({ page }, testInfo) => {
  await setupListingTracking(page, testInfo.titlePath.join(" "));
});

test.afterEach(async ({ page }, testInfo) => {
  await cleanupCreatedListings(page, testInfo.titlePath.join(" "));
});

// ─────────────────────────────────────────────
// Landing page
// ─────────────────────────────────────────────

test.describe("Landing page CTAs", () => {
  test("'List Your Scrap' CTA goes to /list", async ({ page }) => {
    await page.goto(BASE);
    const cta = page.getByRole("link", { name: /list your scrap/i }).or(
      page.getByRole("button", { name: /list your scrap/i })
    );
    await expect(cta).toBeVisible({ timeout: 10_000 });
    await cta.click();
    await expect(page).toHaveURL(/\/list/, { timeout: 10_000 });
  });

  test("'Start Hauling' CTA goes to /haul", async ({ page }) => {
    await page.goto(BASE);
    const cta = page.getByRole("link", { name: /start hauling/i }).or(
      page.getByRole("button", { name: /start hauling/i })
    );
    await expect(cta).toBeVisible({ timeout: 10_000 });
    await cta.click();
    await expect(page).toHaveURL(/\/haul/, { timeout: 10_000 });
  });

  test("no JS crashes on landing page", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto(BASE);
    await page.waitForTimeout(3_000);
    const critical = errors.filter(
      (e) => !e.includes("ResizeObserver") && !e.includes("favicon")
    );
    expect(critical, `JS errors: ${critical.join(", ")}`).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────
// Auth flow
// ─────────────────────────────────────────────

test.describe("Auth flow", () => {
  test("unauthenticated /list shows sign-in form", async ({ page }) => {
    await page.goto(`${BASE}/list`);
    await expect(page.getByText("Sign In to Scrappr")).toBeVisible({ timeout: 10_000 });
  });

  test("sign in with test account, sign out, sign back in", async ({ page }) => {
    await signIn(page, TEST_EMAIL);
    await expect(page.getByText(`Signed in as ${TEST_EMAIL}`)).toBeVisible();

    // Sign out
    const signOutBtn = page.getByRole("button", { name: /sign out/i });
    await signOutBtn.click();
    await expect(page.getByText("Sign In to Scrappr")).toBeVisible({ timeout: 10_000 });

    // Sign back in
    await signIn(page, TEST_EMAIL);
    await expect(page.getByText("My Listings")).toBeVisible();
  });

  test("session persists on page refresh", async ({ page }) => {
    await signIn(page, TEST_EMAIL);
    await page.reload();
    await expect(page.getByText("My Listings")).toBeVisible({ timeout: 15_000 });
  });

  test("wrong password shows error, does not crash", async ({ page }) => {
    await page.goto(`${BASE}/list`);
    await expect(page.getByText("Sign In to Scrappr")).toBeVisible({ timeout: 10_000 });
    await page.getByPlaceholder("you@example.com").fill(TEST_EMAIL);
    await page.getByPlaceholder("••••••••").fill("WrongPassword999!");
    await page.getByRole("button", { name: "Sign In", exact: true }).click();
    await expect(
      page.getByText(/incorrect|invalid|error|wrong|failed/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("no JS crashes on /list while unauthenticated", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto(`${BASE}/list`);
    await page.waitForTimeout(3_000);
    const critical = errors.filter(
      (e) => !e.includes("ResizeObserver") && !e.includes("favicon")
    );
    expect(critical, `JS errors: ${critical.join(", ")}`).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────
// Lister — Create listing (using test account)
// ─────────────────────────────────────────────

test.describe("Lister — create listing", () => {
  const photoPath = path.join(import.meta.dirname, "../fixtures/test-photo.jpg");

  test.beforeEach(async ({ page }) => {
    await mockPlaces(page, "55426");
    await signIn(page, TEST_EMAIL);
  });

  test("create Appliances listing in 55426", async ({ page }) => {
    await page.getByRole("button", { name: "New Listing" }).click();
    await page.getByTestId("photo-input").setInputFiles(photoPath);
    await page.getByTestId("category-appliances").click();
    await page.getByTestId("description-input").fill("QA old dryer, no longer works");
    await page.getByTestId("address-input").fill("3401 Louisiana");
    await page.getByTestId("address-suggestion").first().click({ timeout: 10_000 });
    await page.getByTestId("submit-listing-btn").click();
    await expect(page.getByTestId("submit-listing-btn")).not.toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("QA old dryer, no longer works").first()).toBeVisible({ timeout: 10_000 });
  });

  test("create Steel listing with emoji in description", async ({ page }) => {
    await page.getByRole("button", { name: "New Listing" }).click();
    await page.getByTestId("photo-input").setInputFiles(photoPath);
    await page.getByTestId("category-steel").click();
    await page.getByTestId("description-input").fill("Steel beams 🏗️ heavy, good condition 💪");
    await page.getByTestId("address-input").fill("3515 Xenwood");
    await page.getByTestId("address-suggestion").first().click({ timeout: 10_000 });
    await page.getByTestId("submit-listing-btn").click();
    await expect(page.getByTestId("submit-listing-btn")).not.toBeVisible({ timeout: 15_000 });
  });

  test("submit without required fields shows validation, does not crash", async ({ page }) => {
    await page.getByRole("button", { name: "New Listing" }).click();
    await expect(page.getByText("New Listing").nth(1)).toBeVisible();
    await page.getByTestId("submit-listing-btn").click();
    await page.waitForTimeout(2_000);
    const modalStillOpen = await page.getByTestId("submit-listing-btn").isVisible();
    const hasError = await page.locator("[class*='error'], [role='alert'], [class*='invalid']").count() > 0;
    expect(modalStillOpen || hasError).toBeTruthy();
  });
});

// ─────────────────────────────────────────────
// Zip code rejection
// ─────────────────────────────────────────────

test.describe("Zip code enforcement", () => {
  const photoPath = path.join(import.meta.dirname, "../fixtures/test-photo.jpg");

  test("address outside 55426 is rejected with an error message", async ({ page }) => {
    await mockPlaces(page, "55416", "ChIJMockOutside001");
    await signIn(page, TEST_EMAIL);
    await page.getByRole("button", { name: "New Listing" }).click();
    await expect(page.getByText("New Listing").nth(1)).toBeVisible();
    await page.getByTestId("photo-input").setInputFiles(photoPath);
    await page.getByTestId("category-copper").click();
    await page.getByTestId("description-input").fill("Outside zip test");
    await page.getByTestId("address-input").fill("3945 Wooddale");
    await page.getByTestId("address-suggestion").first().click({ timeout: 10_000 });
    await page.getByTestId("submit-listing-btn").click();
    await expect(
      page.getByText(/55426|zip|service area|not support|outside/i)
    ).toBeVisible({ timeout: 10_000 });
  });
});

// ─────────────────────────────────────────────
// Hauler dashboard
// ─────────────────────────────────────────────

test.describe("Hauler dashboard (/haul)", () => {
  test("/haul loads without error or crash", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto(`${BASE}/haul`);
    await page.waitForTimeout(3_000);
    await expect(page).toHaveURL(/\/haul/);
    const bodyText = await page.locator("body").innerText();
    // Should not show bare 404
    expect(bodyText).not.toMatch(/^404$/);
    expect(bodyText.trim().length).toBeGreaterThan(50);
    const critical = errors.filter(
      (e) => !e.includes("ResizeObserver") && !e.includes("favicon")
    );
    expect(critical, `JS errors: ${critical.join(", ")}`).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────
// Adversarial / edge cases
// ─────────────────────────────────────────────

test.describe("Adversarial and edge cases", () => {
  test("visiting /list/edit/nonexistent-id doesn't white-screen", async ({ page }) => {
    await page.goto(`${BASE}/list/edit/nonexistent-id-99999`);
    await page.waitForTimeout(3_000);
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.trim().length).toBeGreaterThan(0);
  });

  test("rapid back/forward navigation doesn't crash", async ({ page }) => {
    await page.goto(BASE);
    await page.goto(`${BASE}/list`);
    await page.goto(`${BASE}/haul`);
    await page.goBack();
    await page.goBack();
    await page.goForward();
    await page.waitForTimeout(2_000);
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.trim().length).toBeGreaterThan(0);
  });

  test("back button after opening new listing modal doesn't break the app", async ({ page }) => {
    await mockPlaces(page, "55426");
    await signIn(page, TEST_EMAIL);
    await page.getByRole("button", { name: "New Listing" }).click();
    await expect(page.getByText("New Listing").nth(1)).toBeVisible();
    await page.goBack();
    await page.waitForTimeout(2_000);
    const bodyText = await page.locator("body").innerText();
    expect(bodyText.trim().length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────
// Network / API surface checks
// ─────────────────────────────────────────────

test.describe("Network and API checks", () => {
  test("unauthenticated POST to listings API returns 4xx not 5xx", async ({ page }) => {
    const response = await page.request.post(`${BASE}/api/listings`, {
      data: { description: "test", category: "copper" },
      headers: { "Content-Type": "application/json" },
      failOnStatusCode: false,
    });
    expect(response.status()).toBeLessThan(500);
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test("unauthenticated GET to listings API returns valid response", async ({ page }) => {
    const response = await page.request.get(`${BASE}/api/listings`, {
      failOnStatusCode: false,
    });
    // Either 200 (public read) or 401/403 (auth required) — not 500
    expect(response.status()).not.toBe(500);
    expect(response.status()).not.toBe(502);
    expect(response.status()).not.toBe(503);
  });
});
