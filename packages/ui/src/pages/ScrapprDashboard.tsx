import { CLAIM_EXPIRY_HOURS } from "@scrappr/shared/src/constants";
import {
  AlertTriangle,
  ArrowUpDown,
  Clock,
  Filter,
  List,
  Loader2,
  Map as MapIcon,
  MapPin,
  Phone,
  Truck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  browseListings,
  claimListing,
  completeListing,
  getClaimedListings,
  unclaimListing,
} from "../api/client";
import { CategoryIcon } from "../components/CategoryIcon";
import { MapView } from "../components/MapView";
import { CATEGORIES, getCategoryDisplayName } from "../data/mockData";
import { type Category, formatPhoneForDisplay, type Listing } from "../data/types";
import { useAuth } from "../hooks/useAuth";
import { formatRelativeDate } from "../utils/formatDate";

type SortBy = "value" | "type";
type Tab = "available" | "claimed";

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
  const { accessToken, email } = useAuth();

  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>("available");
  const mobileView = (searchParams.get("view") === "map" ? "map" : "list") as "map" | "list";
  const setMobileView = useCallback(
    (view: "map" | "list") => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (view === "list") next.delete("view");
        else next.set("view", view);
        return next;
      });
    },
    [setSearchParams],
  );

  const [filterCategory, setFilterCategory] = useState<Category | "All">("All");
  const [sortBy, setSortBy] = useState<SortBy>("value");

  // Available listings
  const [availableRaw, setAvailableRaw] = useState<Listing[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [availableError, setAvailableError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Claimed listings
  const [claimedListings, setClaimedListings] = useState<Listing[]>([]);
  const [loadingClaimed, setLoadingClaimed] = useState(false);

  // Claim state
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<{ id: string; message: string } | null>(null);
  const [fadingOutId, setFadingOutId] = useState<string | null>(null);

  // Complete/unclaim state
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [unclaimingId, setUnclaimingId] = useState<string | null>(null);

  const fetchAvailable = useCallback(
    async (cursor?: string) => {
      if (!accessToken) return;
      if (cursor) {
        setLoadingMore(true);
      } else {
        setLoadingAvailable(true);
        setAvailableError(null);
      }
      try {
        const data = await browseListings(accessToken, undefined, cursor);
        const newListings = data.listings || [];
        if (cursor) {
          setAvailableRaw((prev) => [...prev, ...newListings]);
        } else {
          setAvailableRaw(newListings);
        }
        setNextCursor(data.nextCursor);
      } catch {
        if (!cursor) setAvailableError("Failed to load listings");
      } finally {
        setLoadingAvailable(false);
        setLoadingMore(false);
      }
    },
    [accessToken],
  );

  const fetchClaimed = useCallback(async () => {
    if (!accessToken) return;
    setLoadingClaimed(true);
    try {
      const data = await getClaimedListings(accessToken);
      setClaimedListings(data.listings || []);
    } catch {
      // silently fail
    } finally {
      setLoadingClaimed(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) fetchAvailable();
  }, [accessToken, fetchAvailable]);

  useEffect(() => {
    if (accessToken) fetchClaimed();
  }, [accessToken, fetchClaimed]);

  // Remember this as the user's last-visited dashboard for post-sign-in defaults.
  useEffect(() => {
    localStorage.setItem("scrappr_last_role", "scrappr");
  }, []);

  // Infinite scroll — load more when sentinel is visible
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || !nextCursor) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursor && !loadingMore) {
          fetchAvailable(nextCursor);
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [nextCursor, loadingMore, fetchAvailable]);

  const availableListings = useMemo(() => {
    let filtered = availableRaw;
    if (filterCategory !== "All") {
      filtered = filtered.filter((l) => l.category === filterCategory);
    }
    return [...filtered].sort((a, b) => {
      if (sortBy === "value") {
        return (VALUE_ORDER[b.category] ?? 0) - (VALUE_ORDER[a.category] ?? 0);
      }
      return a.category.localeCompare(b.category);
    });
  }, [availableRaw, filterCategory, sortBy]);

  const activeClaimedListings = claimedListings.filter((l) => l.status === "claimed");

  const handleClaim = async (listingId: string) => {
    if (!accessToken) return;
    setClaimingId(listingId);
    setClaimError(null);
    try {
      await claimListing(accessToken, listingId);
      setClaimingId(null);

      // Fade out the card, then remove from available and re-fetch claimed (to get full address)
      setFadingOutId(listingId);
      setTimeout(() => {
        setAvailableRaw((prev) => prev.filter((l) => l.listingId !== listingId));
        setFadingOutId(null);
        fetchClaimed();
      }, 400);
    } catch (err) {
      setClaimError({
        id: listingId,
        message: err instanceof Error ? err.message : "Failed to claim listing",
      });
      setClaimingId(null);
      throw err;
    }
  };

  const handleComplete = async (listingId: string) => {
    if (!accessToken) return;
    setCompletingId(listingId);
    try {
      await completeListing(accessToken, listingId);
      setClaimedListings((prev) =>
        prev.map((l) => (l.listingId === listingId ? { ...l, status: "completed" as const } : l)),
      );
    } catch {
      // silently fail
    } finally {
      setCompletingId(null);
    }
  };

  const handleUnclaim = async (listingId: string) => {
    if (!accessToken) return;
    setUnclaimingId(listingId);
    try {
      await unclaimListing(accessToken, listingId);
      setClaimedListings((prev) => prev.filter((l) => l.listingId !== listingId));
      fetchAvailable();
    } catch {
      // silently fail
    } finally {
      setUnclaimingId(null);
    }
  };

  const filterCategories: (Category | "All")[] = ["All", ...CATEGORIES.map((c) => c.name)];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Hauler Dashboard</h1>
              <p className="text-gray-500 text-xs mt-0.5">{email}</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("available");
                  fetchAvailable();
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "available"
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Available
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("claimed");
                  fetchClaimed();
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "claimed"
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                My Claims
                {activeClaimedListings.length > 0 ? ` (${activeClaimedListings.length})` : ""}
              </button>
            </div>
            {activeTab === "available" && (
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1 self-start sm:self-auto">
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
            )}
          </div>
        </div>
      </div>

      {activeTab === "available" ? (
        <>
          {/* Filter Bar */}
          <div className="bg-white border-b border-gray-100 py-3">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="relative">
                <div
                  className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide"
                  style={{ WebkitOverflowScrolling: "touch" }}
                >
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
                      <option value="value">Est. Value</option>
                      <option value="type">Metal Type</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Commitment banner */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Truck size={14} className="flex-shrink-0" />
              <span>When you claim a pickup, you're committing to haul it to a scrap yard.</span>
            </div>
          </div>

          {loadingAvailable ? (
            <div className="flex-1 flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-emerald-600" size={32} />
            </div>
          ) : availableError ? (
            <div className="max-w-7xl mx-auto px-4 py-8">
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                <AlertTriangle size={18} className="text-red-500" />
                <p className="text-sm text-red-700">{availableError}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Map View */}
              <div className={`${mobileView === "map" ? "block" : "hidden"} flex-1`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                  <div className="rounded-2xl overflow-hidden border border-gray-200">
                    <MapView
                      listings={availableListings}
                      className="min-h-[500px] w-full"
                      visible={mobileView === "map"}
                      onClaimClick={(id) => handleClaim(id)}
                    />
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
                      <p className="text-gray-500 text-sm">No available listings right now</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {availableListings.map((listing) => (
                        <AvailableCard
                          key={listing.listingId}
                          listing={listing}
                          onClaim={() => handleClaim(listing.listingId)}
                          claiming={claimingId === listing.listingId}
                          fadingOut={fadingOutId === listing.listingId}
                          error={claimError?.id === listing.listingId ? claimError.message : null}
                        />
                      ))}
                    </div>
                  )}
                  {/* Infinite scroll sentinel */}
                  {nextCursor && (
                    <div ref={loadMoreRef} className="flex justify-center py-8">
                      {loadingMore && (
                        <Loader2 className="animate-spin text-emerald-600" size={24} />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      ) : (
        /* Claimed Tab */
        <div className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {loadingClaimed ? (
              <div className="text-center py-16">
                <Loader2 className="animate-spin text-emerald-600 mx-auto" size={32} />
              </div>
            ) : activeClaimedListings.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Truck size={24} className="text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm">
                  No active pickups. Browse available listings to claim some.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeClaimedListings.map((listing) => (
                  <ClaimedCard
                    key={listing.listingId}
                    listing={listing}
                    onComplete={() => handleComplete(listing.listingId)}
                    completing={completingId === listing.listingId}
                    onUnclaim={() => handleUnclaim(listing.listingId)}
                    unclaiming={unclaimingId === listing.listingId}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sign Out Confirmation */}
    </div>
  );
}

function AvailableCard({
  listing,
  onClaim,
  claiming,
  fadingOut,
  error,
}: {
  listing: Listing;
  onClaim: () => void;
  claiming: boolean;
  fadingOut: boolean;
  error: string | null;
}) {
  const [confirming, setConfirming] = useState(false);
  const [imgError, setImgError] = useState(false);
  const catInfo = CATEGORIES.find((c) => c.name === listing.category);

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(timer);
  }, [confirming]);

  const handleClick = () => {
    if (confirming) {
      onClaim();
      setConfirming(false);
    } else {
      setConfirming(true);
    }
  };

  return (
    <div
      data-testid="available-card"
      className={`bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-400 ${
        fadingOut ? "opacity-0 scale-95" : "opacity-100 scale-100"
      }`}
    >
      <div className="p-4">
        <div className="flex gap-3 mb-3">
          <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
            {listing.photoUrl && !imgError ? (
              <img
                src={listing.photoUrl}
                alt={listing.category}
                loading="lazy"
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Truck size={20} className="text-gray-300" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-gray-900">
                {getCategoryDisplayName(listing.category)}
              </h3>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                Available
              </span>
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
              <MapPin size={14} className="flex-shrink-0 text-gray-400" />
              <span>{listing.address || "Twin Cities area"}</span>
            </div>
          </div>
        </div>
        <p className="text-gray-500 text-sm mb-2 line-clamp-2">{listing.description}</p>
        <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
          <div className="flex items-center gap-1">
            <CategoryIcon category={listing.category} size={14} className="text-emerald-600" />
            <span>{catInfo?.payoutLabel}</span>
          </div>
          {listing.createdAt && <span>{formatRelativeDate(listing.createdAt)}</span>}
        </div>
        {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
        <button
          type="button"
          data-testid="claim-btn"
          onClick={handleClick}
          disabled={claiming}
          className={`w-full px-4 py-2 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-40 ${
            confirming ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          {claiming ? (
            <Loader2 className="animate-spin mx-auto" size={16} />
          ) : confirming ? (
            `Confirm? You have ${CLAIM_EXPIRY_HOURS} hours to pick up`
          ) : (
            "Claim Pickup"
          )}
        </button>
      </div>
    </div>
  );
}

function ClaimedCard({
  listing,
  onComplete,
  completing,
  onUnclaim,
  unclaiming,
}: {
  listing: Listing;
  onComplete: () => void;
  completing: boolean;
  onUnclaim: () => void;
  unclaiming: boolean;
}) {
  const catInfo = CATEGORIES.find((c) => c.name === listing.category);
  const [confirmingUnclaim, setConfirmingUnclaim] = useState(false);
  const [confirmingComplete, setConfirmingComplete] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [, setTick] = useState(0);

  // Countdown timer — re-render every minute
  useEffect(() => {
    if (!listing.claimedAt) return;
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, [listing.claimedAt]);

  const expiryLabel = useMemo(() => {
    if (!listing.claimedAt) return null;
    const expiresAt = new Date(listing.claimedAt).getTime() + CLAIM_EXPIRY_HOURS * 60 * 60 * 1000;
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) return "Expired";
    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const mins = Math.floor((remaining % (60 * 60 * 1000)) / 60000);
    if (hours > 0) return `${hours}h ${mins}m left`;
    return `${mins}m left`;
  }, [listing.claimedAt]);

  useEffect(() => {
    if (!confirmingUnclaim) return;
    const timer = setTimeout(() => setConfirmingUnclaim(false), 3000);
    return () => clearTimeout(timer);
  }, [confirmingUnclaim]);

  useEffect(() => {
    if (!confirmingComplete) return;
    const timer = setTimeout(() => setConfirmingComplete(false), 3000);
    return () => clearTimeout(timer);
  }, [confirmingComplete]);

  const handleUnclaimClick = () => {
    if (confirmingUnclaim) {
      onUnclaim();
      setConfirmingUnclaim(false);
    } else {
      setConfirmingUnclaim(true);
      setConfirmingComplete(false);
    }
  };

  const handleCompleteClick = () => {
    if (confirmingComplete) {
      onComplete();
      setConfirmingComplete(false);
    } else {
      setConfirmingComplete(true);
      setConfirmingUnclaim(false);
    }
  };

  return (
    <div
      data-testid="claimed-card"
      className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="relative w-full h-48 bg-gray-100">
        {listing.photoUrl && !imgError ? (
          <img
            src={listing.photoUrl}
            alt={listing.category}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Truck size={32} className="text-gray-300" />
          </div>
        )}
        <span className="absolute top-3 right-3 px-3 py-1 bg-yellow-500 text-white text-xs font-semibold rounded-full">
          Claimed by you
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-1">
          {getCategoryDisplayName(listing.category)}
        </h3>
        <p className="text-gray-500 text-sm mb-2 line-clamp-2">{listing.description}</p>
        <div className="flex items-center gap-4 text-xs text-gray-400 mb-1">
          <div className="flex items-center gap-1">
            <CategoryIcon category={listing.category} size={14} className="text-emerald-600" />
            <span>{catInfo?.payoutLabel}</span>
          </div>
          {expiryLabel && (
            <div
              className={`flex items-center gap-1 ${
                expiryLabel === "Expired" ? "text-red-500" : "text-amber-500"
              }`}
            >
              <Clock size={12} />
              <span className="font-medium">{expiryLabel}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
          <MapPin size={12} />
          <span>{listing.address}</span>
        </div>
        {listing.phone && (
          <div className="flex items-center gap-1 text-xs text-emerald-600 mb-3">
            <Phone size={12} />
            <a
              href={`tel:${listing.phone}`}
              className="hover:underline"
              data-testid="claimed-phone-link"
            >
              {formatPhoneForDisplay(listing.phone)}
            </a>
          </div>
        )}
        {!listing.phone && <div className="mb-3" />}
        <div className="flex gap-2">
          <button
            type="button"
            data-testid="unclaim-btn"
            onClick={handleUnclaimClick}
            disabled={unclaiming || completing}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all disabled:opacity-40 ${
              confirmingUnclaim
                ? "bg-red-500 text-white hover:bg-red-600"
                : "border border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {unclaiming ? (
              <Loader2 className="animate-spin mx-auto" size={16} />
            ) : confirmingUnclaim ? (
              "Confirm unclaim?"
            ) : (
              "Unclaim"
            )}
          </button>
          <button
            type="button"
            data-testid="complete-btn"
            onClick={handleCompleteClick}
            disabled={completing || unclaiming}
            className={`flex-1 px-4 py-2 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-40 ${
              confirmingComplete
                ? "bg-amber-500 hover:bg-amber-600"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {completing ? (
              <Loader2 className="animate-spin mx-auto" size={16} />
            ) : confirmingComplete ? (
              "Confirm pickup?"
            ) : (
              "Mark Picked Up"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
