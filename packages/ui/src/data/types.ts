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
