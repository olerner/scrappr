import { create } from "zustand";
import { MOCK_LISTINGS } from "../data/mockData";
import type { Address, Listing, ListingStatus } from "../data/types";

interface AppState {
  listings: Listing[];
  addListing: (listing: Listing) => void;
  updateListingStatus: (listingId: string, status: ListingStatus, claimedBy?: string) => void;

  addresses: Address[];
  addressesLoaded: boolean;
  setAddresses: (addresses: Address[]) => void;
  addAddress: (address: Address) => void;
  updateAddress: (addressId: string, updates: Partial<Address>) => void;
  removeAddress: (addressId: string) => void;
}

export const useStore = create<AppState>((set) => ({
  listings: MOCK_LISTINGS,
  addListing: (listing) => set((state) => ({ listings: [listing, ...state.listings] })),
  updateListingStatus: (listingId, status, claimedBy) =>
    set((state) => ({
      listings: state.listings.map((l) =>
        l.listingId === id ? { ...l, status, claimedBy: claimedBy ?? l.claimedBy } : l,
      ),
    })),

  addresses: [],
  addressesLoaded: false,
  setAddresses: (addresses) => set({ addresses, addressesLoaded: true }),
  addAddress: (address) =>
    set((state) => {
      // If the new address is default, unset others
      const updated = address.isDefault
        ? state.addresses.map((a) => ({ ...a, isDefault: false }))
        : state.addresses;
      return { addresses: [...updated, address] };
    }),
  updateAddress: (addressId, updates) =>
    set((state) => ({
      addresses: state.addresses.map((a) => {
        if (a.addressId === addressId) return { ...a, ...updates };
        // If we're setting a new default, unset others
        if (updates.isDefault) return { ...a, isDefault: false };
        return a;
      }),
    })),
  removeAddress: (addressId) =>
    set((state) => {
      const remaining = state.addresses.filter((a) => a.addressId !== addressId);
      // If we removed the default, promote the first remaining
      if (remaining.length > 0 && !remaining.some((a) => a.isDefault)) {
        remaining[0] = { ...remaining[0], isDefault: true };
      }
      return { addresses: remaining };
    }),
}));
