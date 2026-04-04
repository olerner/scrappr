import type { Page } from "@playwright/test";

/**
 * Tracks listing IDs created during e2e tests and deletes them in teardown.
 *
 * Usage:
 *   const tracker = new ListingTracker();
 *   await tracker.install(page);         // auto-captures from POST /listings responses
 *   // ... test creates listings via the UI ...
 *   await tracker.cleanup(page);         // deletes all tracked listings
 */
export class ListingTracker {
  private listingIds: string[] = [];

  /** Manually record a listing ID for later cleanup. */
  add(id: string) {
    this.listingIds.push(id);
  }

  /**
   * Install a response listener on `page` that intercepts POST /listings responses
   * and captures the created listing ID automatically.
   * Call this BEFORE the test creates a listing.
   */
  install(page: Page) {
    page.on("response", async (response) => {
      try {
        const url = response.url();
        const method = response.request().method();
        // Match POST to /listings but not sub-routes like /listings/:id/claim
        if (method === "POST" && /\/listings\/?$/.test(url) && response.ok()) {
          const body = await response.json();
          const id = body?.listingId ?? body?.id;
          if (id) {
            this.listingIds.push(id);
          }
        }
      } catch {
        // ignore parse errors on non-JSON responses
      }
    });
  }

  /**
   * Delete all tracked listings by calling the API directly.
   * Extracts the access token from the page's JavaScript context.
   */
  async cleanup(page: Page) {
    if (this.listingIds.length === 0) return;

    const apiUrl = process.env.VITE_API_URL;
    if (!apiUrl) {
      console.warn("[e2e cleanup] VITE_API_URL not set — skipping cleanup");
      return;
    }

    // Extract the Cognito access token from the page's localStorage/sessionStorage
    const accessToken = await page.evaluate(() => {
      // Cognito JS SDK stores tokens in localStorage with keys like:
      // CognitoIdentityServiceProvider.<clientId>.<username>.accessToken
      for (const key of Object.keys(localStorage)) {
        if (key.endsWith(".accessToken")) {
          return localStorage.getItem(key);
        }
      }
      return null;
    });

    if (!accessToken) {
      console.warn("[e2e cleanup] Could not extract access token — skipping cleanup");
      return;
    }

    const errors: string[] = [];
    for (const id of this.listingIds) {
      try {
        const res = await page.request.delete(`${apiUrl}/listings/${id}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });
        if (!res.ok()) {
          errors.push(`Failed to delete listing ${id}: ${res.status()}`);
        }
      } catch (e) {
        errors.push(`Failed to delete listing ${id}: ${e}`);
      }
    }

    if (errors.length) {
      console.warn("[e2e cleanup] Some listings could not be deleted:", errors);
    }

    const cleaned = this.listingIds.length - errors.length;
    if (cleaned > 0) {
      console.log(`[e2e cleanup] Deleted ${cleaned} test listing(s)`);
    }

    this.listingIds = [];
  }

  get trackedIds(): readonly string[] {
    return this.listingIds;
  }
}
