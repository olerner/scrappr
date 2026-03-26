import type { BlockedCategory, Category, CategoryInfo, Listing } from "./types";

// ── Category metadata ───────────────────────────────────────────────────

export const CATEGORIES: CategoryInfo[] = [
  { name: "Appliances", icon: "Wrench", payoutLabel: "$5 - $18 flat", color: "#059669" },
  { name: "Copper", icon: "Cable", payoutLabel: "$1.10 - $4.80/lb", color: "#b45309" },
  { name: "Aluminum", icon: "Recycle", payoutLabel: "$0.62 - $1.20/lb", color: "#6b7280" },
  { name: "Cans", icon: "Cylinder", payoutLabel: "$0.65/lb", color: "#0891b2" },
  { name: "Brass", icon: "Settings", payoutLabel: "$0.65 - $3.70/lb", color: "#ca8a04" },
  { name: "Steel", icon: "Layers", payoutLabel: "$0.05 - $0.12/lb", color: "#475569" },
  { name: "Electronics", icon: "Zap", payoutLabel: "E-waste redirect", color: "#dc2626" },
  {
    name: "Mixed",
    displayName: "Various / Mixed Metal",
    icon: "Package",
    payoutLabel: "Varies",
    color: "#7c3aed",
  },
  { name: "Lawnmowers", icon: "Wrench", payoutLabel: "$5 - $15 flat", color: "#059669" },
];

export const BLOCKED_CATEGORIES: BlockedCategory[] = [
  "Refrigerators",
  "Freezers",
  "Dehumidifiers",
  "Microwaves",
  "Propane tanks",
  "E-waste",
  "Tires",
];

export const PREP_CHECKLIST_CATEGORIES: Category[] = ["Appliances", "Lawnmowers"];

export function getCategoryDisplayName(category: Category): string {
  return CATEGORIES.find((c) => c.name === category)?.displayName ?? category;
}

// ── Geography ───────────────────────────────────────────────────────────

export const TWIN_CITIES_CENTER = {
  lat: 44.956,
  lng: -93.2,
  zoom: 11.5,
} as const;

// ── Mock listings ───────────────────────────────────────────────────────

export const MOCK_LISTINGS: Listing[] = [
  {
    id: "1",
    category: "Copper",
    description: "Approx 15 lbs of stripped copper pipe from bathroom remodel. Clean, no fittings.",
    photoUrl: "https://images.unsplash.com/photo-1652785723146-ca1a6daf5ecc?w=300&h=200&fit=crop",
    lat: 44.9778,
    lng: -93.265,
    address: "123 Hennepin Ave, Minneapolis",
    status: "available",
    datePosted: "2026-03-19",
    estimatedValue: "$16.50 - $72.00",
  },
  {
    id: "2",
    category: "Copper",
    description:
      "Box of copper wire scraps from electrical job. About 8 lbs, mixed insulated and bare.",
    photoUrl: "https://images.unsplash.com/photo-1687038520563-2310e8b06ed2?w=300&h=200&fit=crop",
    lat: 44.9537,
    lng: -93.09,
    address: "456 Robert St, St. Paul",
    status: "available",
    datePosted: "2026-03-20",
    estimatedValue: "$8.80 - $38.40",
  },
  {
    id: "3",
    category: "Cans",
    description: "Two large garbage bags full of crushed aluminum cans. Rinsed and ready.",
    photoUrl: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=300&h=200&fit=crop",
    lat: 44.94,
    lng: -93.17,
    address: "789 Grand Ave, St. Paul",
    status: "available",
    datePosted: "2026-03-18",
    estimatedValue: "$6.50 - $13.00",
  },
  {
    id: "4",
    category: "Cans",
    description: "Bag of aluminum cans from office recycling drive. About 10 lbs.",
    photoUrl: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=300&h=200&fit=crop",
    lat: 44.9831,
    lng: -93.2718,
    address: "321 Washington Ave N, Minneapolis",
    status: "claimed",
    datePosted: "2026-03-17",
    claimedBy: "MetalMike",
    estimatedValue: "$6.50",
  },
  {
    id: "5",
    category: "Appliances",
    description: "Old Kenmore washing machine. Works but leaks. Curbside, ready for pickup.",
    photoUrl: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=300&h=200&fit=crop",
    lat: 44.9488,
    lng: -93.2358,
    address: "555 Lake St, Minneapolis",
    status: "available",
    datePosted: "2026-03-20",
    estimatedValue: "$7.50 flat",
  },
  {
    id: "6",
    category: "Appliances",
    description:
      "Large 50-gallon water heater. Heavy, will need two people or a dolly. Garage pickup.",
    photoUrl: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=300&h=200&fit=crop",
    lat: 44.9629,
    lng: -93.2686,
    address: "100 1st Ave N, Minneapolis",
    status: "available",
    datePosted: "2026-03-19",
    estimatedValue: "$16.00 flat",
  },
  {
    id: "7",
    category: "Steel",
    description: "Old charcoal grill frame, steel. Grates removed. About 30 lbs of steel.",
    photoUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=300&h=200&fit=crop",
    lat: 44.928,
    lng: -93.167,
    address: "900 W 7th St, St. Paul",
    status: "available",
    datePosted: "2026-03-16",
    estimatedValue: "$1.50 - $3.60",
  },
  {
    id: "8",
    category: "Brass",
    description: "Bag of assorted brass fittings and valves from plumbing job. About 5 lbs total.",
    photoUrl: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=300&h=200&fit=crop",
    lat: 44.9712,
    lng: -93.247,
    address: "220 S 6th St, Minneapolis",
    status: "completed",
    datePosted: "2026-03-14",
    claimedBy: "ScrapQueenTC",
    estimatedValue: "$3.25 - $18.50",
  },
];
