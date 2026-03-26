import { ArrowUpDown, DollarSign, Filter, List, Map as MapIcon, MapPin, Truck } from "lucide-react";
import { useMemo, useState } from "react";
import { CategoryIcon } from "../components/CategoryIcon";
import { MapView } from "../components/MapView";
import { CATEGORIES } from "../data/mockData";
import type { Category, Listing } from "../data/types";
import { useStore } from "../store/useStore";

type SortBy = "distance" | "value" | "type";
type Tab = "available" | "claimed";

const MOCK_DISTANCES: Record<string, string> = {
  "1": "0.8 mi",
  "2": "3.2 mi",
  "3": "1.5 mi",
  "4": "0.4 mi",
  "5": "2.1 mi",
  "6": "1.1 mi",
  "7": "4.6 mi",
  "8": "0.6 mi",
};

const VALUE_ORDER: Record<string, number> = {
  Copper: 5,
  Brass: 4,
  Aluminum: 3,
  Cans: 2,
  Appliances: 2,
  Mixed: 1,
  Steel: 0,
  Lawnmowers: 1,
};

export function ScrapprDashboard() {
  const { listings, updateListingStatus } = useStore();
  const [activeTab, setActiveTab] = useState<Tab>("available");
  const [mobileView, setMobileView] = useState<"map" | "list">("list");
  const [filterCategory, setFilterCategory] = useState<Category | "All">("All");
  const [sortBy, setSortBy] = useState<SortBy>("distance");

  const availableListings = useMemo(() => {
    let filtered = listings.filter((l) => l.status === "available");
    if (filterCategory !== "All") {
      filtered = filtered.filter((l) => l.category === filterCategory);
    }
    return filtered.sort((a, b) => {
      if (sortBy === "distance") {
        return parseFloat(MOCK_DISTANCES[a.id] || "5") - parseFloat(MOCK_DISTANCES[b.id] || "5");
      }
      if (sortBy === "value") {
        return (VALUE_ORDER[b.category] ?? 0) - (VALUE_ORDER[a.category] ?? 0);
      }
      return a.category.localeCompare(b.category);
    });
  }, [listings, filterCategory, sortBy]);

  const claimedListings = listings.filter((l) => l.status === "claimed");

  const routeValue = useMemo(() => {
    const values = claimedListings.map((l) => {
      const match = l.estimatedValue.match(/\$([0-9.]+)/);
      return match ? parseFloat(match[1]) : 0;
    });
    const total = values.reduce((a, b) => a + b, 0);
    return total.toFixed(2);
  }, [claimedListings]);

  const handleClaim = (id: string) => {
    updateListingStatus(id, "claimed", "You");
  };

  const handleComplete = (id: string) => {
    updateListingStatus(id, "completed", "You");
  };

  const filterCategories: (Category | "All")[] = [
    "All",
    "Copper",
    "Aluminum",
    "Cans",
    "Appliances",
    "Brass",
    "Steel",
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-bold text-gray-900">Hauler Dashboard</h1>
            {/* Route Value */}
            {claimedListings.length > 0 && (
              <div className="hidden sm:flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-xl">
                <DollarSign size={16} className="text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-700">
                  Route value: ${routeValue}+
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setActiveTab("claimed")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "claimed"
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                My Claims
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("available")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "available"
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Available
              </button>
            </div>
            {/* View Toggle */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setMobileView("map")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  mobileView === "map"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <MapIcon size={14} />
                Map View
              </button>
              <button
                type="button"
                onClick={() => setMobileView("list")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  mobileView === "list"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <List size={14} />
                List View
              </button>
            </div>
          </div>
        </div>
      </div>

      {activeTab === "available" ? (
        <>
          {/* Filter Bar */}
          <div className="bg-white border-b border-gray-100 py-3">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3 overflow-x-auto pb-1">
                <Filter size={16} className="text-gray-400 flex-shrink-0" />
                {filterCategories.map((cat) => (
                  <button
                    type="button"
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                      filterCategory === cat
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
                <div className="ml-auto flex items-center gap-1 flex-shrink-0">
                  <ArrowUpDown size={14} className="text-gray-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortBy)}
                    className="text-xs text-gray-600 bg-transparent border-none focus:outline-none cursor-pointer font-medium"
                  >
                    <option value="distance">Distance</option>
                    <option value="value">Est. Value</option>
                    <option value="type">Metal Type</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Map View */}
          <div className={`${mobileView === "map" ? "block" : "hidden"} flex-1`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="rounded-2xl overflow-hidden border border-gray-200">
                <MapView listings={listings} className="min-h-[500px] w-full" />
              </div>
            </div>
          </div>

          {/* List View */}
          <div className={`${mobileView === "list" ? "block" : "hidden"} flex-1`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              {availableListings.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Truck size={24} className="text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm">No listings match your filters</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableListings.map((listing) => (
                    <AvailableCard
                      key={listing.id}
                      listing={listing}
                      distance={MOCK_DISTANCES[listing.id] || "2.0 mi"}
                      onClaim={() => handleClaim(listing.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        /* Claimed Tab */
        <div className="flex-1">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {claimedListings.length > 0 && (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                <DollarSign size={20} className="text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">
                    Estimated route value: ${routeValue}+
                  </p>
                  <p className="text-xs text-emerald-600">
                    {claimedListings.length} pickup{claimedListings.length > 1 ? "s" : ""} claimed
                  </p>
                </div>
              </div>
            )}
            {claimedListings.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Truck size={24} className="text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm">
                  No active pickups. Browse available listings to claim some.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {claimedListings.map((listing) => (
                  <ClaimedCard
                    key={listing.id}
                    listing={listing}
                    onComplete={() => handleComplete(listing.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AvailableCard({
  listing,
  distance,
  onClaim,
}: {
  listing: Listing;
  distance: string;
  onClaim: () => void;
}) {
  const catInfo = CATEGORIES.find((c) => c.name === listing.category);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Large photo */}
      <div className="relative w-full h-48 bg-gray-100">
        <img src={listing.photoUrl} alt={listing.category} className="w-full h-full object-cover" />
        <span className="absolute top-3 right-3 px-3 py-1 bg-emerald-500 text-white text-xs font-semibold rounded-full">
          Available
        </span>
      </div>
      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-1">{listing.category}</h3>
        <p className="text-gray-500 text-sm mb-2 line-clamp-2">{listing.description}</p>
        <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
          <div className="flex items-center gap-1">
            <CategoryIcon category={listing.category} size={14} className="text-emerald-600" />
            <span>{catInfo?.payoutLabel}</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin size={12} />
            <span>{distance} away</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-all"
          >
            View Details
          </button>
          <button
            type="button"
            onClick={onClaim}
            className="flex-1 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-all"
          >
            Claim Pickup
          </button>
        </div>
      </div>
    </div>
  );
}

function ClaimedCard({ listing, onComplete }: { listing: Listing; onComplete: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Large photo */}
      <div className="relative w-full h-48 bg-gray-100">
        <img src={listing.photoUrl} alt={listing.category} className="w-full h-full object-cover" />
        <span className="absolute top-3 right-3 px-3 py-1 bg-yellow-500 text-white text-xs font-semibold rounded-full">
          Claimed by you
        </span>
      </div>
      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-1">{listing.category}</h3>
        <p className="text-gray-500 text-sm mb-1 line-clamp-2">{listing.description}</p>
        <div className="flex items-center gap-4 text-xs text-gray-400 mb-1">
          <span>{listing.estimatedValue}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400 mb-3">
          <MapPin size={12} />
          <span>{listing.address}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-all"
          >
            View Details
          </button>
          <button
            type="button"
            onClick={onComplete}
            className="flex-1 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-all"
          >
            Mark Picked Up
          </button>
        </div>
      </div>
    </div>
  );
}
