import path from "node:path";
import { expect, test } from "@playwright/test";

const TEST_EMAIL = "test@scrappr.dev";
const TEST_PASSWORD = "TestPass123!";

test.describe("Listing Creation Flow", () => {
  test("sign in, create listing with photo, see it in My Listings", async ({ page }) => {
    // 1. Navigate to scrappee dashboard
    await page.goto("/scrappee");

    // 2. Should see sign-in form
    await expect(page.getByText("Sign In to Scrappr")).toBeVisible();

    // 3. Sign in
    await page.getByPlaceholder("you@example.com").fill(TEST_EMAIL);
    await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign In", exact: true }).click();

    // 4. Wait for dashboard to load
    await expect(page.getByText("My Listings")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(`Signed in as ${TEST_EMAIL}`)).toBeVisible();

    // 5. Open "New Listing" modal
    await page.getByRole("button", { name: "New Listing" }).click();
    await expect(page.getByText("New Listing").nth(1)).toBeVisible();

    // 6. Select category "Copper"
    await page.getByTestId("category-copper").click();

    // 7. Upload test photo
    const fileInput = page.getByTestId("photo-input");
    const testPhotoPath = path.join(import.meta.dirname, "../fixtures/test-photo.jpg");
    await fileInput.setInputFiles(testPhotoPath);

    // 8. Fill description
    await page.getByTestId("description-input").fill("Test copper pipe, about 10 lbs");

    // 9. Fill address via autocomplete
    // Mock Photon API to avoid flakiness in CI
    await page.route("**/photon.komoot.io/**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [-93.265, 44.9778],
              },
              properties: {
                housenumber: "123",
                street: "Test St",
                city: "Minneapolis",
                state: "Minnesota",
              },
            },
          ],
        }),
      });
    });
    await page.getByTestId("address-input").fill("Minneapolis");
    await page.getByTestId("address-suggestion").first().click({ timeout: 10_000 });

    // 10. Submit
    await page.getByTestId("submit-listing-btn").click();

    // 11. Wait for modal to close and listing to appear
    await expect(page.getByTestId("submit-listing-btn")).not.toBeVisible({ timeout: 15_000 });

    // 12. Assert listing appears in My Listings
    await expect(page.getByText("Test copper pipe, about 10 lbs").first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
