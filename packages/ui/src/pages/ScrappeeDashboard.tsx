import { Image as ImageIcon, Loader2, LogOut, Pencil, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getMyListings } from "../api/client";
import { CategoryIcon } from "../components/CategoryIcon";
import { StatusBadge } from "../components/StatusBadge";
import { getCategoryDisplayName } from "../data/mockData";
import type { Listing } from "../data/types";
import { useAuth } from "../hooks/useAuth";
import { formatRelativeDate } from "../utils/formatDate";

export function ScrappeeDashboard() {
  const { email, accessToken } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(false);

  const fetchListings = useCallback(async () => {
    if (!accessToken) return;
    setLoadingListings(true);
    try {
      const data = await getMyListings(accessToken);
      setListings(data.listings || []);
    } catch {
      // silently fail for now
    } finally {
      setLoadingListings(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  // Remember this as the user's last-visited dashboard for post-sign-in defaults.
  useEffect(() => {
    localStorage.setItem("scrappr_last_role", "scrappee");
  }, []);

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
                    <ListingCard key={listing.listingId} listing={listing} />
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
                      <ListingCard key={listing.listingId} listing={listing} />
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

function ListingCard({ listing }: { listing: Listing }) {
  const navigate = useNavigate();
  const isEditable = listing.status === "available";
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 transition-shadow ${
        isEditable ? "hover:shadow-md hover:border-emerald-200 cursor-pointer" : ""
      }`}
      onClick={isEditable ? () => navigate(`/list/edit/${listing.listingId}`) : undefined}
      role={isEditable ? "button" : undefined}
      tabIndex={isEditable ? 0 : undefined}
      onKeyDown={
        isEditable
          ? (e) => {
              if (e.key === "Enter") navigate(`/list/edit/${listing.listingId}`);
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
                <Link
                  to={`/list/edit/${listing.listingId}`}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Edit listing"
                  title="Edit listing"
                >
                  <Pencil size={15} />
                </Link>
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
