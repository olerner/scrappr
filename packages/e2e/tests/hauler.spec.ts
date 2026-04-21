import path from "node:path";
import { expect, HAULER_EMAIL, HAULER_PASSWORD, TEST_EMAIL, test } from "../fixtures";

// Real address in St. Louis Park, MN (zip 55416) — within Scrappr's service area
const ADDRESS_QUERY = "5005 Minnetonka Blvd St Louis Park";

test("scrappee creates listing, hauler claims and marks picked up", async ({ signInAs }) => {
  // Unique description so we can reliably find this listing in the hauler view
  const testDescription = `E2E hauler test - aluminum scrap ${Date.now()}`;

  // ── Step 1: Sign in as scrappee and create a listing ──────────────────────

  const page = await signInAs(TEST_EMAIL, "TestPass123!");
  await page.goto("/list");
  await expect(page.getByText("Your Listings")).toBeVisible({ timeout: 15_000 });

  await page.getByRole("link", { name: "New Listing" }).click();
  await expect(page.getByText("Create a New Scrap Metal Listing")).toBeVisible();

  // Upload photo
  const fileInput = page.getByTestId("photo-input");
  const testPhotoPath = path.join(import.meta.dirname, "../fixtures/test-photo.jpg");
  await fileInput.setInputFiles(testPhotoPath);

  // Select category
  await page.getByTestId("category-aluminum").click();

  // Fill description with unique text
  await page.getByTestId("description-input").fill(testDescription);

  // Handle address — add if none saved, otherwise auto-selected
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

  // Opt in to phone sharing — hauler should see the phone only after claiming.
  await page.getByTestId("share-phone-checkbox").check();
  await page.getByTestId("phone-input").fill("(612) 555-0199");

  await expect(page.getByTestId("submit-listing-btn")).toBeEnabled({ timeout: 10_000 });
  await page.getByTestId("submit-listing-btn").click();
  await expect(page.getByText("Your Listings")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(testDescription).first()).toBeVisible({ timeout: 10_000 });

  // ── Step 2: Sign out and sign in as hauler ────────────────────────────────

  await page.goto("/signed-out");
  await expect(page.getByText("You've been signed out")).toBeVisible({ timeout: 10_000 });

  await signInAs(HAULER_EMAIL, HAULER_PASSWORD);
  await page.goto("/haul");
  await expect(page.getByText("Hauler Dashboard")).toBeVisible({ timeout: 15_000 });

  // Wait for listings to load (spinner disappears)
  await expect(page.getByText("Hauler Dashboard")).toBeVisible();
  await expect(page.locator(".animate-spin").first()).not.toBeVisible({ timeout: 10_000 });

  // The listing is newest-first; find the card with our description
  const availableCard = page.getByTestId("available-card").filter({ hasText: testDescription });
  await expect(availableCard).toBeVisible({ timeout: 10_000 });

  // Phone is redacted in browse — it must not appear anywhere on the available card
  await expect(availableCard.getByText(/555-?0199/)).toHaveCount(0);

  // ── Step 4: Claim the listing (2-click confirmation) ──────────────────────

  await availableCard.getByTestId("claim-btn").click();
  await expect(availableCard.getByTestId("claim-btn")).toContainText("Confirm", { timeout: 3_000 });
  await availableCard.getByTestId("claim-btn").click();

  // Card fades out and is removed from available list
  await expect(availableCard).not.toBeVisible({ timeout: 5_000 });

  // ── Step 5: Verify listing appears in My Claims ───────────────────────────

  await page.getByRole("button", { name: /My Claims/ }).click();
  const claimedCard = page.getByTestId("claimed-card").filter({ hasText: testDescription });
  await expect(claimedCard).toBeVisible({ timeout: 10_000 });
  await expect(claimedCard.getByText("Claimed by you")).toBeVisible();

  // Phone is revealed to the hauler only after claiming
  const phoneLink = claimedCard.getByTestId("claimed-phone-link");
  await expect(phoneLink).toBeVisible();
  await expect(phoneLink).toHaveText("(612) 555-0199");
  await expect(phoneLink).toHaveAttribute("href", "tel:+16125550199");

  // ── Step 6: Mark as picked up (2-click confirmation) ──────────────────────

  await claimedCard.getByTestId("complete-btn").click();
  await expect(claimedCard.getByTestId("complete-btn")).toContainText("Confirm", {
    timeout: 3_000,
  });
  await claimedCard.getByTestId("complete-btn").click();

  // Card disappears from active claims (status changes to "completed")
  await expect(claimedCard).not.toBeVisible({ timeout: 10_000 });
});

test("abandoned claim confirmation does not claim the listing", async ({ page }) => {
  const testDescription = `E2E abandon claim test ${Date.now()}`;

  // 1. Sign in as scrappee and create a listing
  await page.goto("/list");
  await expect(page.getByText("Sign In to Scrappr")).toBeVisible();
  await page.getByPlaceholder("you@example.com").fill(SCRAPPEE_EMAIL);
  await page.getByPlaceholder("••••••••").fill(SCRAPPEE_PASSWORD);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page.getByText("Your Listings")).toBeVisible({ timeout: 15_000 });

  await page.getByRole("link", { name: "New Listing" }).click();
  await expect(page.getByText("Create a New Scrap Metal Listing")).toBeVisible();

  const testPhotoPath = path.join(import.meta.dirname, "../fixtures/test-photo.jpg");
  await page.getByTestId("photo-input").setInputFiles(testPhotoPath);
  await page.getByTestId("category-aluminum").click();
  await page.getByTestId("description-input").fill(testDescription);

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

  // 2. Sign out, sign in as hauler
  await page.goto("/signed-out");
  await expect(page.getByText("You've been signed out")).toBeVisible({ timeout: 10_000 });

  await page.goto("/haul");
  await expect(page.getByText("Sign In to Scrappr")).toBeVisible();
  await page.getByPlaceholder("you@example.com").fill(HAULER_EMAIL);
  await page.getByPlaceholder("••••••••").fill(HAULER_PASSWORD);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page.getByText("Hauler Dashboard")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".animate-spin").first()).not.toBeVisible({ timeout: 10_000 });

  // 3. Start claim but don't confirm — navigate away
  const card = page.getByTestId("available-card").filter({ hasText: testDescription });
  await expect(card).toBeVisible({ timeout: 10_000 });

  await card.getByTestId("claim-btn").click();
  await expect(card.getByTestId("claim-btn")).toContainText("Confirm", { timeout: 3_000 });

  // Navigate away without confirming
  await page.goto("/haul");
  await expect(page.getByText("Hauler Dashboard")).toBeVisible({ timeout: 15_000 });
  await expect(page.locator(".animate-spin").first()).not.toBeVisible({ timeout: 10_000 });

  // 4. Listing should still be available (claim was never confirmed)
  const cardAfter = page.getByTestId("available-card").filter({ hasText: testDescription });
  await expect(cardAfter).toBeVisible({ timeout: 10_000 });
});
