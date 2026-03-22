import { useState, useMemo } from 'react';
import {
  Map as MapIcon,
  List,
  Filter,
  DollarSign,
  MapPin,
  Truck,
  CheckCircle2,
  ArrowUpDown,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { CategoryIcon } from '../components/CategoryIcon';
import { StatusBadge } from '../components/StatusBadge';
import { MapView } from '../components/MapView';
import { CATEGORIES } from '../data/mockData';
import type { Category, Listing } from '../data/types';

type SortBy = 'distance' | 'value' | 'type';
type Tab = 'available' | 'claimed';

const MOCK_DISTANCES: Record<string, string> = {
  '1': '0.8 mi',
  '2': '3.2 mi',
  '3': '1.5 mi',
  '4': '0.4 mi',
  '5': '2.1 mi',
  '6': '1.1 mi',
  '7': '4.6 mi',
  '8': '0.6 mi',
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
  const [activeTab, setActiveTab] = useState<Tab>('available');
  const [mobileView, setMobileView] = useState<'map' | 'list'>('list');
  const [filterCategory, setFilterCategory] = useState<Category | 'All'>('All');
  const [sortBy, setSortBy] = useState<SortBy>('distance');

  const availableListings = useMemo(() => {
    let filtered = listings.filter((l) => l.status === 'available');
    if (filterCategory !== 'All') {
      filtered = filtered.filter((l) => l.category === filterCategory);
    }
    return filtered.sort((a, b) => {
      if (sortBy === 'distance') {
        return parseFloat(MOCK_DISTANCES[a.id] || '5') - parseFloat(MOCK_DISTANCES[b.id] || '5');
      }
      if (sortBy === 'value') {
        return (VALUE_ORDER[b.category] ?? 0) - (VALUE_ORDER[a.category] ?? 0);
      }
      return a.category.localeCompare(b.category);
    });
  }, [listings, filterCategory, sortBy]);

  const claimedListings = listings.filter((l) => l.status === 'claimed');

  const routeValue = useMemo(() => {
    const values = claimedListings.map((l) => {
      const match = l.estimatedValue.match(/\$([0-9.]+)/);
      return match ? parseFloat(match[1]) : 0;
    });
    const total = values.reduce((a, b) => a + b, 0);
    return total.toFixed(2);
  }, [claimedListings]);

  const handleClaim = (id: string) => {
    updateListingStatus(id, 'claimed', 'You');
  };

  const handleComplete = (id: string) => {
    updateListingStatus(id, 'completed', 'You');
  };

  const filterCategories: (Category | 'All')[] = ['All', 'Copper', 'Aluminum', 'Cans', 'Appliances', 'Brass', 'Steel'];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Tab Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex gap-1 py-2">
              <button
                onClick={() => setActiveTab('available')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'available'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                Available ({availableListings.length})
              </button>
              <button
                onClick={() => setActiveTab('claimed')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'claimed'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                My Pickups ({claimedListings.length})
              </button>
            </div>
            {/* Route Value */}
            {claimedListings.length > 0 && (
              <div className="hidden sm:flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-xl">
                <DollarSign size={16} className="text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-700">Route value: ${routeValue}+</span>
              </div>
            )}
            {/* Mobile Toggle */}
            <div className="flex sm:hidden gap-1">
              <button
                onClick={() => setMobileView('list')}
                className={`p-2 rounded-lg ${mobileView === 'list' ? 'bg-emerald-100 text-emerald-600' : 'text-gray-400'}`}
              >
                <List size={18} />
              </button>
              <button
                onClick={() => setMobileView('map')}
                className={`p-2 rounded-lg ${mobileView === 'map' ? 'bg-emerald-100 text-emerald-600' : 'text-gray-400'}`}
              >
                <MapIcon size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {activeTab === 'available' ? (
        <>
          {/* Filter Bar */}
          <div className="bg-white border-b border-gray-100 py-3">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3 overflow-x-auto pb-1">
                <Filter size={16} className="text-gray-400 flex-shrink-0" />
                {filterCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                      filterCategory === cat
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700'
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

          {/* Split View */}
          <div className="flex-1 flex">
            {/* Map - Desktop always, Mobile conditional */}
            <div className={`${mobileView === 'map' ? 'flex' : 'hidden'} sm:flex w-full sm:w-[60%] flex-col`}>
              <MapView listings={listings} className="flex-1 min-h-[400px]" />
            </div>

            {/* List */}
            <div className={`${mobileView === 'list' ? 'flex' : 'hidden'} sm:flex w-full sm:w-[40%] flex-col bg-white sm:border-l border-gray-200 overflow-y-auto overflow-x-hidden`}>
              <div className="p-4 space-y-3">
                {availableListings.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Truck size={24} className="text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-sm">No listings match your filters</p>
                  </div>
                ) : (
                  availableListings.map((listing) => (
                    <AvailableCard
                      key={listing.id}
                      listing={listing}
                      distance={MOCK_DISTANCES[listing.id] || '2.0 mi'}
                      onClaim={() => handleClaim(listing.id)}
                    />
                  ))
                )}
              </div>
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
                  <p className="text-sm font-semibold text-emerald-800">Estimated route value: ${routeValue}+</p>
                  <p className="text-xs text-emerald-600">{claimedListings.length} pickup{claimedListings.length > 1 ? 's' : ''} claimed</p>
                </div>
              </div>
            )}
            {claimedListings.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Truck size={24} className="text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm">No active pickups. Browse available listings to claim some.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {claimedListings.map((listing) => (
                  <ClaimedCard key={listing.id} listing={listing} onComplete={() => handleComplete(listing.id)} />
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
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex gap-3">
        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
          <img src={listing.photoUrl} alt={listing.category} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <CategoryIcon category={listing.category} size={14} className="text-emerald-600" />
            <span className="font-semibold text-gray-900 text-sm">{listing.category}</span>
            <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
              {catInfo?.payoutLabel}
            </span>
          </div>
          <p className="text-gray-600 text-xs line-clamp-2 mb-2">{listing.description}</p>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <MapPin size={12} className="flex-shrink-0" />
              <span>{distance} away</span>
            </div>
            <button
              onClick={onClaim}
              className="flex-shrink-0 px-4 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-all"
            >
              Claim Pickup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClaimedCard({ listing, onComplete }: { listing: Listing; onComplete: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-yellow-200 p-4">
      <div className="flex gap-3">
        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
          <img src={listing.photoUrl} alt={listing.category} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <CategoryIcon category={listing.category} size={14} className="text-yellow-600" />
            <span className="font-semibold text-gray-900 text-sm">{listing.category}</span>
            <StatusBadge status="claimed" />
          </div>
          <p className="text-gray-600 text-xs line-clamp-1 mb-1">{listing.description}</p>
          <p className="text-xs text-gray-400 mb-2">{listing.address}</p>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-600">{listing.estimatedValue}</span>
            <button
              onClick={onComplete}
              className="inline-flex items-center gap-1 px-4 py-1.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-lg hover:bg-emerald-200 transition-all"
            >
              <CheckCircle2 size={12} />
              Mark Complete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
