import { Image as ImageIcon, Loader2, LogOut, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { deleteListing, getMyListings } from "../api/client";
import { CategoryIcon } from "../components/CategoryIcon";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { getCategoryDisplayName } from "../data/mockData";
import type { Category, Listing } from "../data/types";
import { formatRelativeDate } from "../utils/formatDate";

export function ScrappeeDashboard() {
  const {
    isAuthenticated,
    isLoading: authLoading,
    email,
    accessToken,
    signIn,
    initiateGoogleSignIn,
    error: authError,
  } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(false);

  // Redirect to saved return path after sign-in (e.g. user was on /haul)
  useEffect(() => {
    if (!isAuthenticated) return;
    const returnPath = sessionStorage.getItem("scrappr_return_path");
    if (returnPath && returnPath !== "/list") {
      sessionStorage.removeItem("scrappr_return_path");
      navigate(returnPath, { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const fetchListings = useCallback(async () => {
    if (!accessToken) return;
    setLoadingListings(true);
    try {
      const data = await getMyListings(accessToken);
      const mapped: Listing[] = (data.listings || []).map((item: Record<string, unknown>) => ({
        id: (item.listingId as string) || "",
        category: (item.category as Category) || "Mixed",
        description: (item.description as string) || "",
        photoUrl: (item.photoUrl as string) || "",
        lat: (item.lat as number) || 0,
        lng: (item.lng as number) || 0,
        address: (item.address as string) || "",
        status: (item.status as Listing["status"]) || "available",
        datePosted: (item.datePosted as string) || "",
        estimatedValue: (item.estimatedValue as string) || "Varies",
      }));
      setListings(mapped);
    } catch {
      // silently fail for now
    } finally {
      setLoadingListings(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      fetchListings();
    }
  }, [isAuthenticated, accessToken, fetchListings]);

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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Your Listings</h1>
            <p className="text-gray-500 text-sm mt-1">
              Signed in as {email}{" "}
              <Link
                to="/signed-out"
                className="text-emerald-600 hover:underline inline-flex items-center gap-1 ml-2"
              >
                <LogOut size={12} /> Sign out
              </Link>
            </p>
          </div>
          <Link
            to="/list/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg"
          >
            <Plus size={18} />
            New Listing
          </Link>
        </div>

        {/* Listings */}
        {loadingListings ? (
          <div className="text-center py-20">
            <Loader2 className="animate-spin text-emerald-600 mx-auto" size={32} />
          </div>
        ) : listings.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {listings.filter((l) => l.status === "available" || l.status === "claimed").length >
              0 && (
              <div className="grid gap-4">
                {listings
                  .filter((l) => l.status === "available" || l.status === "claimed")
                  .map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      accessToken={accessToken}
                      onDeleted={fetchListings}
                    />
                  ))}
              </div>
            )}
            {listings.filter((l) => l.status === "completed" || l.status === "confirmed").length >
              0 && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold text-gray-500 mb-4">Completed</h2>
                <div className="grid gap-4 opacity-75">
                  {listings
                    .filter((l) => l.status === "completed" || l.status === "confirmed")
                    .map((listing) => (
                      <ListingCard
                        key={listing.id}
                        listing={listing}
                        accessToken={accessToken}
                        onDeleted={fetchListings}
                      />
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
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

        {/* Google Sign-In */}
        <button
          type="button"
          onClick={onGoogleSignIn}
          className="w-full py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center justify-center gap-3"
          data-testid="google-signin-btn"
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

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-sm text-gray-400">or</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Email/Password Form */}
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

function EmptyState() {
  return (
    <div className="text-center py-20">
      <img
        src="/scrappy-mascot.png"
        alt="Scrappy the dog mascot"
        className="w-32 h-32 rounded-2xl object-cover mx-auto mb-6"
      />
      <h3 className="text-xl font-bold text-gray-900 mb-2">No Listings Yet</h3>
      <p className="text-gray-500 mb-6 max-w-sm mx-auto">
        You haven't created any scrap metal listings yet. Create your first listing to get started!
      </p>
      <Link
        to="/list/new"
        className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-all"
      >
        <Plus size={18} />
        Create Your First Listing
      </Link>
    </div>
  );
}

function ListingCard({
  listing,
  accessToken,
  onDeleted,
}: {
  listing: Listing;
  accessToken: string | null;
  onDeleted: () => void;
}) {
  const navigate = useNavigate();
  const isEditable = listing.status === "available";
  const [imgError, setImgError] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    if (!accessToken) return;
    setDeleting(true);
    try {
      await deleteListing(accessToken, listing.id);
      onDeleted();
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 transition-shadow ${
        isEditable ? "hover:shadow-md hover:border-emerald-200 cursor-pointer" : ""
      }`}
      onClick={isEditable ? () => navigate(`/list/edit/${listing.id}`) : undefined}
      role={isEditable ? "button" : undefined}
      tabIndex={isEditable ? 0 : undefined}
      onKeyDown={
        isEditable
          ? (e) => {
              if (e.key === "Enter") navigate(`/list/edit/${listing.id}`);
            }
          : undefined
      }
    >
      <div className="flex gap-4">
        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
          {listing.photoUrl && !imgError ? (
            <img
              src={listing.photoUrl}
              alt={listing.category}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon size={24} className="text-gray-300" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <CategoryIcon category={listing.category} size={16} className="text-emerald-600" />
              <span className="font-semibold text-gray-900 text-sm">
                {getCategoryDisplayName(listing.category)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={listing.status} />
              {isEditable && (
                <button
                  type="button"
                  onClick={handleDelete}
                  onBlur={() => setConfirmDelete(false)}
                  disabled={deleting}
                  className={`p-1.5 rounded-lg transition-colors ${
                    confirmDelete
                      ? "bg-red-100 text-red-600 hover:bg-red-200"
                      : "text-gray-400 hover:text-red-500 hover:bg-red-50"
                  }`}
                  title={confirmDelete ? "Click again to confirm" : "Delete listing"}
                >
                  {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              )}
            </div>
          </div>
          <p className="text-gray-600 text-sm mt-1 line-clamp-2">{listing.description}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
            <span>Posted {formatRelativeDate(listing.datePosted)}</span>
            {listing.claimedBy && (
              <span className="text-yellow-600 font-medium">Hauler: {listing.claimedBy}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
