import path from "node:path";
import { expect, test } from "@playwright/test";

const TEST_EMAIL = "test@scrappr.dev";
const TEST_PASSWORD = "TestPass123!";

test.describe("Listing Creation Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Mock Google Places Autocomplete API
    await page.route("**/places.googleapis.com/v1/places:autocomplete**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          suggestions: [
            {
              placePrediction: {
                text: { text: "123 Test St, St Louis Park, MN 55426, USA" },
                placeId: "ChIJTestPlace123",
              },
            },
          ],
        }),
      });
    });

    // Mock Google Places Details API — must return zip 55426 (only accepted zip)
    await page.route("**/places.googleapis.com/v1/places/ChIJTestPlace123**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          location: {
            latitude: 44.9298,
            longitude: -93.3477,
          },
          formattedAddress: "123 Test St, St Louis Park, MN 55426, USA",
          addressComponents: [
            { types: ["street_number"], shortText: "123" },
            { types: ["route"], shortText: "Test St" },
            { types: ["locality"], shortText: "St Louis Park" },
            { types: ["administrative_area_level_1"], shortText: "MN" },
            { types: ["postal_code"], shortText: "55426" },
            { types: ["country"], shortText: "US" },
          ],
        }),
      });
    });

    // Sign in
    await page.goto("/scrappee");
    await expect(page.getByText("Sign In to Scrappr")).toBeVisible();
    await page.getByPlaceholder("you@example.com").fill(TEST_EMAIL);
    await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign In", exact: true }).click();
    await expect(page.getByText("My Listings")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(`Signed in as ${TEST_EMAIL}`)).toBeVisible();
  });

  test("create listing with photo, see it in My Listings", async ({ page }) => {
    // 1. Open "New Listing" modal
    await page.getByRole("button", { name: "New Listing" }).click();
    await expect(page.getByText("New Listing").nth(1)).toBeVisible();

    // 2. Upload test photo
    const fileInput = page.getByTestId("photo-input");
    const testPhotoPath = path.join(import.meta.dirname, "../fixtures/test-photo.jpg");
    await fileInput.setInputFiles(testPhotoPath);

    // 3. Select category "Copper"
    await page.getByTestId("category-copper").click();

    // 4. Fill description
    await page.getByTestId("description-input").fill("Test copper pipe, about 10 lbs");

    // 5. Fill address via autocomplete (zip 55426 auto-fills from Places details)
    await page.getByTestId("address-input").fill("123 Test St");
    await page.getByTestId("address-suggestion").first().click({ timeout: 10_000 });

    // 6. Submit
    await page.getByTestId("submit-listing-btn").click();

    // 7. Wait for modal to close and listing to appear
    await expect(page.getByTestId("submit-listing-btn")).not.toBeVisible({ timeout: 15_000 });

    // 8. Assert listing appears in My Listings
    await expect(page.getByText("Test copper pipe, about 10 lbs").first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("drag-and-drop photo upload shows preview", async ({ page }) => {
    // 1. Open "New Listing" modal
    await page.getByRole("button", { name: "New Listing" }).click();
    await expect(page.getByText("New Listing").nth(1)).toBeVisible();

    // 2. Verify dropzone exists
    const dropzone = page.getByTestId("photo-dropzone");
    await expect(dropzone).toBeVisible();

    // 3. Verify click-to-upload button is present
    const uploadBtn = page.getByTestId("photo-upload-btn");
    await expect(uploadBtn).toBeVisible();
    await expect(uploadBtn).toContainText("Click or drag to upload a photo");

    // 4. Upload a photo via file input
    const fileInput = page.getByTestId("photo-input");
    const testPhotoPath = path.join(import.meta.dirname, "../fixtures/test-photo.jpg");
    await fileInput.setInputFiles(testPhotoPath);

    // 5. Verify photo preview appears
    await expect(page.getByAltText("Preview")).toBeVisible({ timeout: 5_000 });
    await expect(uploadBtn).not.toBeVisible();

    // 6. Remove the photo and verify upload zone returns
    await page.locator("[data-testid='photo-dropzone'] button").click();
    await expect(uploadBtn).toBeVisible();
    await expect(uploadBtn).toContainText("Click or drag to upload a photo");
  });
});
