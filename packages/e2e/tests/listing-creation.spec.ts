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
          formattedAddress: "123 Test St, St. Louis Park, MN 55426, USA",
          addressComponents: [
            { types: ["street_number"], shortText: "123", longText: "123" },
            { types: ["route"], shortText: "Test St", longText: "Test Street" },
            { types: ["locality"], shortText: "St. Louis Park", longText: "St. Louis Park" },
            { types: ["administrative_area_level_1"], shortText: "MN", longText: "Minnesota" },
            { types: ["postal_code"], shortText: "55426", longText: "55426" },
            { types: ["country"], shortText: "US", longText: "United States" },
          ],
        }),
      });
    });

    // Mock addresses API — return empty initially, accept saves
    await page.route("**/addresses", (route) => {
      if (route.request().method() === "GET") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ addresses: [] }),
        });
      } else if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            addressId: "test-addr-1",
            label: body?.label || "",
            address: body?.address || "123 Test St, St Louis Park, MN 55426, USA",
            lat: body?.lat || 44.9298,
            lng: body?.lng || -93.3477,
            zipCode: body?.zipCode || "55426",
            isDefault: true,
            createdAt: new Date().toISOString(),
          }),
        });
      } else {
        route.continue();
      }
    });

    // Mock listings API — stateful: starts empty, returns created listings after POST
    const createdListings: Record<string, unknown>[] = [];
    await page.route("**/listings**", (route) => {
      if (route.request().method() === "GET") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ listings: createdListings }),
        });
      } else if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        const listing = {
          listingId: `test-listing-${createdListings.length + 1}`,
          category: body?.category || "Copper",
          description: body?.description || "Test copper pipe, about 10 lbs",
          photoKey: "test-photo.jpg",
          photoUrl: "https://example.com/test-photo.jpg",
          address: "123 Test St, St. Louis Park, MN 55426, USA",
          lat: 44.9298,
          lng: -93.3477,
          zipCode: "55426",
          status: "available",
          createdAt: new Date().toISOString(),
        };
        createdListings.push(listing);
        route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(listing),
        });
      } else {
        route.continue();
      }
    });

    // Mock presigned URL for photo upload
    await page.route("**/photos/presign**", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          uploadUrl: "https://example-bucket.s3.amazonaws.com/test-upload",
          photoUrl: "https://example-cdn.cloudfront.net/photos/test-photo.jpg",
          key: "photos/test-photo.jpg",
        }),
      });
    });

    // Mock S3 upload (PUT to pre-signed URL)
    await page.route("**/s3.amazonaws.com/**", (route) => {
      route.fulfill({ status: 200 });
    });
    await page.route("**/example-bucket.s3.amazonaws.com/**", (route) => {
      route.fulfill({ status: 200 });
    });

    // Sign in
    await page.goto("/list");
    await expect(page.getByText("Sign In to Scrappr")).toBeVisible();
    await page.getByPlaceholder("you@example.com").fill(TEST_EMAIL);
    await page.getByPlaceholder("••••••••").fill(TEST_PASSWORD);
    await page.getByRole("button", { name: "Sign In", exact: true }).click();
    await expect(page.getByText("Your Listings")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(`Signed in as ${TEST_EMAIL}`)).toBeVisible();
  });

  test("create listing with photo, see it in My Listings", async ({ page }) => {
    // 1. Navigate to New Listing page
    await page.getByRole("link", { name: "New Listing" }).click();
    await expect(page.getByText("Create a New Scrap Metal Listing")).toBeVisible();

    // 2. Upload test photo
    const fileInput = page.getByTestId("photo-input");
    const testPhotoPath = path.join(import.meta.dirname, "../fixtures/test-photo.jpg");
    await fileInput.setInputFiles(testPhotoPath);

    // 3. Select category "Copper"
    await page.getByTestId("category-copper").click();

    // 4. Fill description
    await page.getByTestId("description-input").fill("Test copper pipe, about 10 lbs");

    // 5. Add address via AddressPicker → AddressBook flow
    // Since no addresses exist, "Add a pickup address" button opens the address book
    await page.getByRole("button", { name: "Add a pickup address" }).click();
    await expect(page.getByText("Saved Addresses")).toBeVisible();

    // Type address in autocomplete and wait for suggestions to appear
    await page.getByTestId("address-input").fill("123 Test St");
    await expect(page.getByTestId("address-suggestion").first()).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("address-suggestion").first().click();

    // Wait for place details to resolve and Save button to become enabled
    await expect(page.getByRole("button", { name: "Save" })).toBeEnabled({ timeout: 10_000 });
    await page.getByRole("button", { name: "Save" }).click();

    // Wait for address to be saved (address appears in the saved list)
    await expect(page.locator("span").filter({ hasText: "123 Test St" })).toBeVisible({
      timeout: 10_000,
    });

    // Close the address book
    await page.getByRole("button", { name: "Done" }).click();

    // 6. Submit — wait for button to become enabled (address auto-selected)
    await expect(page.getByTestId("submit-listing-btn")).toBeEnabled({ timeout: 10_000 });
    await page.getByTestId("submit-listing-btn").click();

    // 7. Wait for navigation back to listings
    await expect(page.getByText("Your Listings")).toBeVisible({ timeout: 15_000 });

    // 8. Assert listing appears in My Listings
    await expect(page.getByText("Test copper pipe, about 10 lbs").first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("drag-and-drop photo upload shows preview", async ({ page }) => {
    // 1. Navigate to New Listing page
    await page.getByRole("link", { name: "New Listing" }).click();
    await expect(page.getByText("Create a New Scrap Metal Listing")).toBeVisible();

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
