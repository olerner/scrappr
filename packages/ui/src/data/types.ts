// ── Service area ─────────────────────────────────────────────────────────

export { ALLOWED_AREA_LABEL, isAllowedZip } from "@scrappr/shared/src/constants";
export const ALLOWED_CITY = "St. Louis Park";

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

// ── Listing (UI shape) ──────────────────────────────────────────────────

export interface Listing {
  id: string;
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
}
