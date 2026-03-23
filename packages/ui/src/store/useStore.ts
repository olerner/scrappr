import { create } from "zustand";
import { MOCK_LISTINGS } from "../data/mockData";
import type { Listing, ListingStatus } from "../data/types";

interface AppState {
  listings: Listing[];
  addListing: (listing: Listing) => void;
  updateListingStatus: (id: string, status: ListingStatus, claimedBy?: string) => void;
}

export const useStore = create<AppState>((set) => ({
  listings: MOCK_LISTINGS,
  addListing: (listing) => set((state) => ({ listings: [listing, ...state.listings] })),
  updateListingStatus: (id, status, claimedBy) =>
    set((state) => ({
      listings: state.listings.map((l) =>
        l.id === id ? { ...l, status, claimedBy: claimedBy ?? l.claimedBy } : l,
      ),
    })),
}));
