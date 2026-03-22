export type Category =
  | 'Appliances'
  | 'Copper'
  | 'Aluminum'
  | 'Cans'
  | 'Brass'
  | 'Steel'
  | 'Electronics'
  | 'Mixed'
  | 'Lawnmowers';

export type ListingStatus = 'available' | 'claimed' | 'completed';

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

export type BlockedCategory =
  | 'Refrigerators'
  | 'Freezers'
  | 'Dehumidifiers'
  | 'Microwaves'
  | 'Propane tanks'
  | 'E-waste'
  | 'Tires';

export interface CategoryInfo {
  name: Category;
  icon: string;
  payoutLabel: string;
  color: string;
}
