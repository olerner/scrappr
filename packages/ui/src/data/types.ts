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
  estimatedValue: string;
}
