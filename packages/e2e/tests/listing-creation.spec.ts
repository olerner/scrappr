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
    // Mock Google Places Autocomplete API
    await page.route("**/places.googleapis.com/v1/places:autocomplete**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          suggestions: [
            {
              placePrediction: {
                text: { text: "123 Test St, Minneapolis, MN, USA" },
                placeId: "ChIJTestPlace123",
              },
            },
          ],
        }),
      });
    });

    // Mock Google Places Details API
    await page.route("**/places.googleapis.com/v1/places/ChIJTestPlace123**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          location: {
            latitude: 44.9778,
            longitude: -93.265,
          },
          formattedAddress: "123 Test St, Minneapolis, MN 55401, USA",
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

  test("drag-and-drop photo upload shows preview", async ({ page }) => {
    // 1. Sign in
    await page.goto("/scrappee");
    await page.getByPlaceholder("you@example.com").fill(TEST_EMAIL);
    await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign In", exact: true }).click();
    await expect(page.getByText("My Listings")).toBeVisible({ timeout: 15_000 });

    // 2. Open "New Listing" modal
    await page.getByRole("button", { name: "New Listing" }).click();
    await expect(page.getByText("New Listing").nth(1)).toBeVisible();

    // 3. Verify dropzone exists
    const dropzone = page.getByTestId("photo-dropzone");
    await expect(dropzone).toBeVisible();

    // 4. Verify click-to-upload button is present
    const uploadBtn = page.getByTestId("photo-upload-btn");
    await expect(uploadBtn).toBeVisible();
    await expect(uploadBtn).toContainText("Click or drag to upload a photo");

    // 5. Simulate drag-and-drop a photo via the file input (Playwright doesn't natively
    //    support DataTransfer drag events, so we use setInputFiles as the equivalent)
    const fileInput = page.getByTestId("photo-input");
    const testPhotoPath = path.join(import.meta.dirname, "../fixtures/test-photo.jpg");
    await fileInput.setInputFiles(testPhotoPath);

    // 6. Verify photo preview appears (upload button is replaced by preview image)
    await expect(page.getByAlt("Preview")).toBeVisible({ timeout: 5_000 });
    await expect(uploadBtn).not.toBeVisible();

    // 7. Remove the photo and verify upload zone returns
    await page.locator("[data-testid='photo-dropzone'] button").click();
    await expect(uploadBtn).toBeVisible();
    await expect(uploadBtn).toContainText("Click or drag to upload a photo");
  });
});
