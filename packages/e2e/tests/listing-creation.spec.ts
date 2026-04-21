import path from "node:path";
import { expect, test } from "../fixtures";

// Real address in St. Louis Park, MN (zip 55416) — within Scrappr's service area
const ADDRESS_QUERY = "5005 Minnetonka Blvd St Louis Park";

test.describe("Listing Creation Flow", () => {
  test.beforeEach(async ({ authedPage: page }) => {
    await page.goto("/list");
    await expect(page.getByText("Your Listings")).toBeVisible({ timeout: 15_000 });
  });

  test("create listing with photo, see it in My Listings", async ({ authedPage: page }) => {
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

    // 5. Handle address picker — add address if none saved yet, otherwise use existing
    await expect(
      page.getByRole("button", { name: "Add a pickup address" }).or(page.getByRole("combobox")),
    ).toBeVisible({ timeout: 10_000 });

    if (await page.getByRole("button", { name: "Add a pickup address" }).isVisible()) {
      await page.getByRole("button", { name: "Add a pickup address" }).click();
      await expect(page.getByText("Saved Addresses")).toBeVisible();
      await page.getByTestId("address-input").fill(ADDRESS_QUERY);
      await expect(page.getByTestId("address-suggestion").first()).toBeVisible({ timeout: 15_000 });
      await page.getByTestId("address-suggestion").first().click();
      await expect(page.getByRole("button", { name: "Save" })).toBeEnabled({ timeout: 10_000 });
      await page.getByRole("button", { name: "Save" }).click();
      await expect(page.locator("span").filter({ hasText: "Minnetonka" })).toBeVisible({
        timeout: 10_000,
      });
      await page.getByRole("button", { name: "Done" }).click();
    }
    // else: address already saved and auto-selected by AddressPicker

    // 6. Submit
    await expect(page.getByTestId("submit-listing-btn")).toBeEnabled({ timeout: 10_000 });
    await page.getByTestId("submit-listing-btn").click();

    // 7. Wait for navigation back to listings
    await expect(page.getByText("Your Listings")).toBeVisible({ timeout: 15_000 });

    // 8. Assert listing appears in My Listings with photo
    await expect(page.getByText("Test copper pipe, about 10 lbs").first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByAltText("copper").first()).toBeVisible();
  });

  test("phone sharing: checkbox gates input, invalid number blocks submit", async ({
    authedPage: page,
  }) => {
    await page.getByRole("link", { name: "New Listing" }).click();
    await expect(page.getByText("Create a New Scrap Metal Listing")).toBeVisible();

    // Phone input is hidden until the checkbox is ticked
    await expect(page.getByTestId("phone-input")).not.toBeVisible();

    const shareCheckbox = page.getByTestId("share-phone-checkbox");
    await shareCheckbox.check();
    await expect(page.getByTestId("phone-input")).toBeVisible();

    // Fill in required fields so the only thing blocking submit is the phone
    const fileInput = page.getByTestId("photo-input");
    const testPhotoPath = path.join(import.meta.dirname, "../fixtures/test-photo.jpg");
    await fileInput.setInputFiles(testPhotoPath);
    await page.getByTestId("category-copper").click();
    await page.getByTestId("description-input").fill("phone validation test");

    // Address — add if none saved, otherwise auto-selected by AddressPicker
    await expect(
      page.getByRole("button", { name: "Add a pickup address" }).or(page.getByRole("combobox")),
    ).toBeVisible({ timeout: 10_000 });
    if (await page.getByRole("button", { name: "Add a pickup address" }).isVisible()) {
      await page.getByRole("button", { name: "Add a pickup address" }).click();
      await page.getByTestId("address-input").fill(ADDRESS_QUERY);
      await expect(page.getByTestId("address-suggestion").first()).toBeVisible({ timeout: 15_000 });
      await page.getByTestId("address-suggestion").first().click();
      await page.getByRole("button", { name: "Save" }).click();
      await page.getByRole("button", { name: "Done" }).click();
    }

    // Invalid phone → submit disabled
    await page.getByTestId("phone-input").fill("123");
    await expect(page.getByTestId("submit-listing-btn")).toBeDisabled();

    // Valid phone → submit enabled
    await page.getByTestId("phone-input").fill("(612) 555-0199");
    await expect(page.getByTestId("submit-listing-btn")).toBeEnabled({ timeout: 5_000 });

    // Unchecking the box clears the validation block even if phone is empty
    await shareCheckbox.uncheck();
    await expect(page.getByTestId("phone-input")).not.toBeVisible();
    await expect(page.getByTestId("submit-listing-btn")).toBeEnabled();
  });

  test("drag-and-drop photo upload shows preview", async ({ authedPage: page }) => {
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

  test("edit listing description and verify persistence", async ({ authedPage: page }) => {
    // 1. Create a listing
    await page.getByRole("link", { name: "New Listing" }).click();
    await expect(page.getByText("Create a New Scrap Metal Listing")).toBeVisible();

    const testPhotoPath = path.join(import.meta.dirname, "../fixtures/test-photo.jpg");
    await page.getByTestId("photo-input").setInputFiles(testPhotoPath);
    await page.getByTestId("category-copper").click();

    const originalDesc = `Edit test copper ${Date.now()}`;
    await page.getByTestId("description-input").fill(originalDesc);

    await expect(
      page.getByRole("button", { name: "Add a pickup address" }).or(page.getByRole("combobox")),
    ).toBeVisible({ timeout: 10_000 });
    if (await page.getByRole("button", { name: "Add a pickup address" }).isVisible()) {
      await page.getByRole("button", { name: "Add a pickup address" }).click();
      await page.getByTestId("address-input").fill(ADDRESS_QUERY);
      await expect(page.getByTestId("address-suggestion").first()).toBeVisible({ timeout: 15_000 });
      await page.getByTestId("address-suggestion").first().click();
      await expect(page.getByRole("button", { name: "Save" })).toBeEnabled({ timeout: 10_000 });
      await page.getByRole("button", { name: "Save" }).click();
      await expect(page.locator("span").filter({ hasText: "Minnetonka" })).toBeVisible({
        timeout: 10_000,
      });
      await page.getByRole("button", { name: "Done" }).click();
    }

    await expect(page.getByTestId("submit-listing-btn")).toBeEnabled({ timeout: 10_000 });
    await page.getByTestId("submit-listing-btn").click();
    await expect(page.getByText("Your Listings")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(originalDesc).first()).toBeVisible({ timeout: 10_000 });

    // 2. Click listing to open edit page
    await page.getByText(originalDesc).first().click();
    await expect(page.getByText("Edit Listing")).toBeVisible({ timeout: 10_000 });

    // 3. Edit description
    const descInput = page.getByPlaceholder(/describe the metal/i);
    await descInput.scrollIntoViewIfNeeded();
    const updatedDesc = `EDITED ${originalDesc}`;
    await descInput.fill(updatedDesc);

    // 4. Save
    const saveBtn = page.getByRole("button", { name: /save/i });
    await saveBtn.scrollIntoViewIfNeeded();
    await expect(saveBtn).toBeEnabled({ timeout: 5_000 });
    await saveBtn.click();

    // 5. Verify persistence
    await expect(page.getByText("Your Listings")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(updatedDesc).first()).toBeVisible({ timeout: 10_000 });

    // 6. Re-open to confirm saved
    await page.getByText(updatedDesc).first().click();
    await expect(page.getByText("Edit Listing")).toBeVisible({ timeout: 10_000 });
    const descInputReload = page.getByPlaceholder(/describe the metal/i);
    await descInputReload.scrollIntoViewIfNeeded();
    await expect(descInputReload).toHaveValue(updatedDesc, { timeout: 10_000 });
  });

  test("out-of-zone address is rejected", async ({ authedPage: page }) => {
    await page.getByRole("link", { name: "New Listing" }).click();
    await expect(page.getByText("Create a New Scrap Metal Listing")).toBeVisible();

    const testPhotoPath = path.join(import.meta.dirname, "../fixtures/test-photo.jpg");
    await page.getByTestId("photo-input").setInputFiles(testPhotoPath);
    await page.getByTestId("category-copper").click();
    await page.getByTestId("description-input").fill("Out of zone test");

    await expect(
      page.getByRole("button", { name: "Add a pickup address" }).or(page.getByRole("combobox")),
    ).toBeVisible({ timeout: 10_000 });

    if (await page.getByRole("button", { name: "Add a pickup address" }).isVisible()) {
      await page.getByRole("button", { name: "Add a pickup address" }).click();
      await expect(page.getByText("Saved Addresses")).toBeVisible();
      await page.getByTestId("address-input").fill("350 Fifth Avenue New York NY");
      await expect(page.getByTestId("address-suggestion").first()).toBeVisible({ timeout: 15_000 });
      await page.getByTestId("address-suggestion").first().click();

      // Should show an out-of-area error or the save button should be disabled
      const outOfAreaError = page.getByText(/outside|not available|service area|not supported/i);
      const saveBtn = page.getByRole("button", { name: "Save" });
      await expect(outOfAreaError.or(saveBtn)).toBeVisible({ timeout: 10_000 });

      if (await outOfAreaError.isVisible()) {
        // Good — out-of-area rejected with message
      } else {
        await expect(saveBtn).toBeDisabled();
      }
    }
  });

  test("special characters and malicious input do not crash the page", async ({ authedPage: page }) => {
    await page.getByRole("link", { name: "New Listing" }).click();
    await expect(page.getByText("Create a New Scrap Metal Listing")).toBeVisible();

    const maliciousInputs = [
      '<script>alert("xss")</script>',
      "'; DROP TABLE listings; --",
      "Test 🔥🚀💰 emoji input",
      "a".repeat(500),
    ];

    for (const input of maliciousInputs) {
      await page.getByTestId("description-input").fill(input);
      await expect(page.getByText("Create a New Scrap Metal Listing")).toBeVisible();
    }
  });

  test("edit nonexistent listing ID does not crash", async ({ authedPage: page }) => {
    await page.goto("/list/edit/nonexistent-id-12345");

    const dashboard = page.getByText("Your Listings");
    const notFound = page.getByText(/not found|error|doesn't exist/i);

    await expect(dashboard.or(notFound)).toBeVisible({ timeout: 15_000 });
  });
});

test.describe("Landing Page", () => {
  test("CTAs navigate to list and haul routes", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/scrap metal pickups/i).first()).toBeVisible({ timeout: 10_000 });

    const listCta = page.getByRole("link", { name: /list your scrap/i });
    const haulCta = page.getByRole("link", { name: /start hauling/i });

    await expect(listCta).toBeVisible();
    await expect(haulCta).toBeVisible();

    await listCta.click();
    await expect(page).toHaveURL(/\/(list|sign-in)/, { timeout: 10_000 });
    await page.goBack();

    await page.goto("/");
    await haulCta.click();
    await expect(page).toHaveURL(/\/(haul|sign-in)/, { timeout: 10_000 });
  });

  test("session persists across page refresh", async ({ authedPage: page, auth }) => {
    await page.reload();
    await expect(page.getByText("Your Listings")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(`Signed in as ${auth.email}`)).toBeVisible();
  });
});