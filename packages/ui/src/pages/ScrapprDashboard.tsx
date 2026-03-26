import {
  AlertTriangle,
  ArrowUpDown,
  Clock,
  DollarSign,
  Filter,
  List,
  Loader2,
  Map as MapIcon,
  MapPin,
  Truck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { CATEGORIES } from "../data/mockData";
import type { Category, Listing } from "../data/types";
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

function mapApiListing(item: Record<string, unknown>): Listing {
  return {
    id: (item.listingId as string) || "",
    category: (item.category as Category) || "Mixed",
    description: (item.description as string) || "",
    photoUrl: (item.photoUrl as string) || "",
    lat: (item.lat as number) || 0,
    lng: (item.lng as number) || 0,
    address: (item.address as string) || "",
    status: (item.status as Listing["status"]) || "available",
    datePosted: (item.datePosted as string) || (item.createdAt as string) || "",
    claimedBy: item.claimedBy as string | undefined,
    claimedAt: item.claimedAt as string | undefined,
    estimatedValue: (item.estimatedValue as string) || "Varies",
  };
}

export function ScrapprDashboard() {
  const {
    isAuthenticated,
    isLoading: authLoading,
    accessToken,
    signIn,
    signOut,
    initiateGoogleSignIn,
    email,
    error: authError,
  } = useAuth();

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
  const [availableError, setAvailableError] = useState<string | null>(null);

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

  const fetchAvailable = useCallback(async () => {
    if (!accessToken) return;
    setLoadingAvailable(true);
    setAvailableError(null);
    try {
      const data = await browseListings(accessToken);
      setAvailableRaw((data.listings || []).map(mapApiListing));
    } catch {
      setAvailableError("Failed to load listings");
    } finally {
      setLoadingAvailable(false);
    }
  }, [accessToken]);

  const fetchClaimed = useCallback(async () => {
    if (!accessToken) return;
    setLoadingClaimed(true);
    try {
      const data = await getClaimedListings(accessToken);
      setClaimedListings((data.listings || []).map(mapApiListing));
    } catch {
      // silently fail
    } finally {
      setLoadingClaimed(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (isAuthenticated && accessToken) fetchAvailable();
  }, [isAuthenticated, accessToken, fetchAvailable]);

  useEffect(() => {
    if (isAuthenticated && accessToken) fetchClaimed();
  }, [isAuthenticated, accessToken, fetchClaimed]);

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

  const routeValue = useMemo(() => {
    const active = claimedListings.filter((l) => l.status === "claimed");
    const values = active.map((l) => {
      const match = l.estimatedValue.match(/\$([0-9.]+)/);
      return match ? parseFloat(match[1]) : 0;
    });
    return values.reduce((a, b) => a + b, 0).toFixed(2);
  }, [claimedListings]);

  const activeClaimedListings = claimedListings.filter((l) => l.status === "claimed");

  const handleClaim = async (listingId: string) => {
    if (!accessToken) return;
    setClaimingId(listingId);
    setClaimError(null);
    try {
      await claimListing(accessToken, listingId);
      setClaimingId(null);

      // Fade out the card, then move it to claimed
      setFadingOutId(listingId);
      setTimeout(() => {
        const claimed = availableRaw.find((l) => l.id === listingId);
        setAvailableRaw((prev) => prev.filter((l) => l.id !== listingId));
        if (claimed) {
          setClaimedListings((prev) => [{ ...claimed, status: "claimed" as const }, ...prev]);
        }
        setFadingOutId(null);
      }, 400);
    } catch (err) {
      setClaimError({
        id: listingId,
        message: err instanceof Error ? err.message : "Failed to claim listing",
      });
      setClaimingId(null);
    }
  };

  const handleComplete = async (listingId: string) => {
    if (!accessToken) return;
    setCompletingId(listingId);
    try {
      await completeListing(accessToken, listingId);
      setClaimedListings((prev) =>
        prev.map((l) => (l.id === listingId ? { ...l, status: "completed" as const } : l)),
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
      const unclaimed = claimedListings.find((l) => l.id === listingId);
      setClaimedListings((prev) => prev.filter((l) => l.id !== listingId));
      if (unclaimed) {
        setAvailableRaw((prev) => [{ ...unclaimed, status: "available" as const }, ...prev]);
      }
    } catch {
      // silently fail
    } finally {
      setUnclaimingId(null);
    }
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-600" size={32} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <SignInForm onSignIn={signIn} onGoogleSignIn={initiateGoogleSignIn} error={authError} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Hauler Dashboard</h1>
              <p className="text-gray-500 text-xs mt-0.5">
                {email}{" "}
                <button
                  type="button"
                  onClick={signOut}
                  className="text-emerald-600 hover:underline ml-1"
                >
                  Sign out
                </button>
              </p>
            </div>
            {activeClaimedListings.length > 0 && (
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
                onClick={() => setActiveTab("available")}
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
                onClick={() => setActiveTab("claimed")}
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
            )}
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
                    <option value="value">Est. Value</option>
                    <option value="type">Metal Type</option>
                  </select>
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
                          key={listing.id}
                          listing={listing}
                          onClaim={() => handleClaim(listing.id)}
                          claiming={claimingId === listing.id}
                          fadingOut={fadingOutId === listing.id}
                          error={claimError?.id === listing.id ? claimError.message : null}
                        />
                      ))}
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
            ) : (
              <>
                {activeClaimedListings.length > 0 && (
                  <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                    <DollarSign size={20} className="text-emerald-600" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-800">
                        Estimated route value: ${routeValue}+
                      </p>
                      <p className="text-xs text-emerald-600">
                        {activeClaimedListings.length} pickup
                        {activeClaimedListings.length > 1 ? "s" : ""} claimed
                      </p>
                    </div>
                  </div>
                )}
                {activeClaimedListings.length === 0 ? (
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
                        key={listing.id}
                        listing={listing}
                        onComplete={() => handleComplete(listing.id)}
                        completing={completingId === listing.id}
                        onUnclaim={() => handleUnclaim(listing.id)}
                        unclaiming={unclaimingId === listing.id}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SignInForm({
  onSignIn,
  onGoogleSignIn,
  error,
}: {
  onSignIn: (email: string, password: string) => Promise<void>;
  onGoogleSignIn: () => void;
  error: string | null;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSignIn(email, password);
    } catch {
      // error is handled by useAuth
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">Sign In to Scrappr</h2>
        <button
          type="button"
          onClick={onGoogleSignIn}
          className="w-full py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center justify-center gap-3"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label="Google logo"
          >
            <title>Google logo</title>
            <path
              d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
              fill="#4285F4"
            />
            <path
              d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
              fill="#34A853"
            />
            <path
              d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
              fill="#FBBC05"
            />
            <path
              d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
              fill="#EA4335"
            />
          </svg>
          Sign in with Google
        </button>
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-sm text-gray-400">or</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="••••••••"
              required
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-40"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
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
      className={`bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-400 ${
        fadingOut ? "opacity-0 scale-95" : "opacity-100 scale-100"
      }`}
    >
      <div className="p-4">
        <div className="flex gap-3 mb-3">
          <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
            {listing.photoUrl ? (
              <img
                src={listing.photoUrl}
                alt={listing.category}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Truck size={20} className="text-gray-300" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-gray-900">{listing.category}</h3>
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
          {listing.datePosted && <span>{formatRelativeDate(listing.datePosted)}</span>}
        </div>
        {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
        <button
          type="button"
          onClick={handleClick}
          disabled={claiming}
          className={`w-full px-4 py-2 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-40 ${
            confirming ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-600 hover:bg-emerald-700"
          }`}
        >
          {claiming ? (
            <Loader2 className="animate-spin mx-auto" size={16} />
          ) : confirming ? (
            "Confirm claim?"
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
  const [, setTick] = useState(0);

  // Countdown timer — re-render every minute
  useEffect(() => {
    if (!listing.claimedAt) return;
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, [listing.claimedAt]);

  const expiryLabel = useMemo(() => {
    if (!listing.claimedAt) return null;
    const expiresAt = new Date(listing.claimedAt).getTime() + 24 * 60 * 60 * 1000;
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
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="relative w-full h-48 bg-gray-100">
        {listing.photoUrl ? (
          <img
            src={listing.photoUrl}
            alt={listing.category}
            className="w-full h-full object-cover"
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
        <h3 className="font-semibold text-gray-900 mb-1">{listing.category}</h3>
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
        <div className="flex items-center gap-1 text-xs text-gray-400 mb-3">
          <MapPin size={12} />
          <span>{listing.address}</span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
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
