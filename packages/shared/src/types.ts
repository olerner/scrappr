// ── User roles ──────────────────────────────────────────────────────────

export const UserRole = {
  User: "user",
  Scrapyard: "scrapyard",
  Admin: "admin",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// ── Service area ─────────────────────────────────────────────────────────

export const ALLOWED_ZIPS = ["55426", "55416"];
export const ALLOWED_CITY = "St. Louis Park";
export const ALLOWED_AREA_LABEL = "St. Louis Park, MN";

export function isAllowedZip(zip: string): boolean {
  return ALLOWED_ZIPS.includes(zip.trim());
}

// ── Phone numbers ────────────────────────────────────────────────────────
// The canonical implementation lives in packages/infra/src/lambdas/phone.mjs
// so it can be shipped as-is by `lambda.Code.fromAsset`. We re-export it here
// so UI code can import from `@scrappr/shared/src/types` as before.
// Stored as E.164 (+1XXXXXXXXXX). US-only for MVP.
export {
  formatPhoneForDisplay,
  isValidPhone,
  normalizePhone,
} from "../../infra/src/lambdas/phone.mjs";

// ── Categories ──────────────────────────────────────────────────────────

export type Category =
  | "Appliances"
  | "Copper"
  | "Aluminum"
  | "Cans"
  | "Brass"
  | "Steel"
  | "Electronics"
  | "Mixed"
  | "Lawnmowers";

export type BlockedCategory =
  | "Refrigerators"
  | "Freezers"
  | "Dehumidifiers"
  | "Microwaves"
  | "Propane tanks"
  | "E-waste"
  | "Tires";

export type ListingStatus = "available" | "claimed" | "completed" | "confirmed";

// ── Category metadata ───────────────────────────────────────────────────

export interface CategoryInfo {
  name: Category;
  displayName?: string;
  icon: string;
  payoutLabel: string;
  color: string;
}

// ── Address ──────────────────────────────────────────────────────────────

export interface Address {
  addressId: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
  zipCode: string;
  isDefault: boolean;
  createdAt: string;
}

// ── Listing ─────────────────────────────────────────────────────────────

export interface Listing {
  listingId: string;
  category: Category;
  description: string;
  photoUrl: string;
  lat: number;
  lng: number;
  address: string;
  status: ListingStatus;
  datePosted: string;
  claimedBy?: string;
  claimedAt?: string;
  estimatedValue: string;
  /** Opt-in flag persisted on the listing so re-edit shows the correct state. */
  sharePhone?: boolean;
  /** E.164 `+1XXXXXXXXXX`. Redacted from public browse; revealed to the hauler after claim. */
  phone?: string;
}

// ── User profile ────────────────────────────────────────────────────────

/**
 * Lightweight per-user profile for data that doesn't belong on a listing.
 * Currently just holds an optional default phone number to auto-fill on new
 * listings when the user opts in to phone sharing.
 */
export interface UserProfile {
  userId: string;
  /** Default phone stored as E.164. Used to auto-fill the listing form. */
  phone?: string;
  updatedAt?: string;
}
