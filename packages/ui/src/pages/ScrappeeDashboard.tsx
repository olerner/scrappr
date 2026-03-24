import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Image as ImageIcon,
  Loader2,
  LogOut,
  MapPin,
  Plus,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createListing, getMyListings, getPresignedUrl, uploadPhoto } from "../api/client";
import { CategoryIcon } from "../components/CategoryIcon";
import { StatusBadge } from "../components/StatusBadge";
import { BLOCKED_CATEGORIES, CATEGORIES, PREP_CHECKLIST_CATEGORIES } from "../data/mockData";
import type { BlockedCategory, Category, Listing } from "../data/types";
import { useAuth } from "../hooks/useAuth";

export function ScrappeeDashboard() {
  const {
    isAuthenticated,
    isLoading: authLoading,
    email,
    accessToken,
    signIn,
    signOut,
    initiateGoogleSignIn,
    error: authError,
  } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loadingListings, setLoadingListings] = useState(false);

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
            <h1 className="text-2xl font-bold text-gray-900">My Listings</h1>
            <p className="text-gray-500 text-sm mt-1">
              Signed in as {email}{" "}
              <button
                type="button"
                onClick={signOut}
                className="text-emerald-600 hover:underline inline-flex items-center gap-1 ml-2"
              >
                <LogOut size={12} /> Sign out
              </button>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg"
          >
            <Plus size={18} />
            New Listing
          </button>
        </div>

        {/* Listings */}
        {loadingListings ? (
          <div className="text-center py-20">
            <Loader2 className="animate-spin text-emerald-600 mx-auto" size={32} />
          </div>
        ) : listings.length === 0 ? (
          <EmptyState onNewListing={() => setShowModal(true)} />
        ) : (
          <div className="grid gap-4">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>

      {/* New Listing Modal */}
      {showModal && accessToken && (
        <NewListingModal
          accessToken={accessToken}
          onClose={() => setShowModal(false)}
          onCreated={() => {
            setShowModal(false);
            fetchListings();
          }}
        />
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

function EmptyState({ onNewListing }: { onNewListing: () => void }) {
  return (
    <div className="text-center py-20">
      <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <ImageIcon size={32} className="text-emerald-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No listings yet</h3>
      <p className="text-gray-500 mb-6 max-w-sm mx-auto">
        Got scrap metal lying around? List it for free and a local hauler will pick it up.
      </p>
      <button
        type="button"
        onClick={onNewListing}
        className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-all"
      >
        <Plus size={18} />
        Create Your First Listing
      </button>
    </div>
  );
}

function ListingCard({ listing }: { listing: Listing }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex gap-4">
        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
          {listing.photoUrl ? (
            <img
              src={listing.photoUrl}
              alt={listing.category}
              className="w-full h-full object-cover"
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
              <span className="font-semibold text-gray-900 text-sm">{listing.category}</span>
            </div>
            <StatusBadge status={listing.status} />
          </div>
          <p className="text-gray-600 text-sm mt-1 line-clamp-2">{listing.description}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
            <span>Posted {listing.datePosted}</span>
            {listing.claimedBy && (
              <span className="text-yellow-600 font-medium">Hauler: {listing.claimedBy}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function NewListingModal({
  accessToken,
  onClose,
  onCreated,
}: {
  accessToken: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [category, setCategory] = useState<Category | "">("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showBlocked, setShowBlocked] = useState<string | null>(null);
  const [showChecklist, setShowChecklist] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleCategorySelect = (cat: string) => {
    if (BLOCKED_CATEGORIES.includes(cat as BlockedCategory)) {
      setShowBlocked(cat);
      setCategory("");
      return;
    }
    setShowBlocked(null);
    setCategory(cat as Category);
    if (PREP_CHECKLIST_CATEGORIES.includes(cat as Category)) {
      setShowChecklist(true);
    } else {
      setShowChecklist(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!category || !description) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      let photoUrl = "";

      // Upload photo if selected
      if (photoFile) {
        const presign = await getPresignedUrl(accessToken, photoFile.type);
        await uploadPhoto(presign.uploadUrl, photoFile);
        photoUrl = presign.photoUrl;
      }

      const catInfo = CATEGORIES.find((c) => c.name === category);

      await createListing(accessToken, {
        category: category as string,
        description,
        photoUrl,
        lat: 44.96 + (Math.random() - 0.5) * 0.05,
        lng: -93.22 + (Math.random() - 0.5) * 0.1,
        address: address || "Minneapolis, MN",
        estimatedValue: catInfo?.payoutLabel || "Varies",
      });

      onCreated();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create listing");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-lg font-semibold text-gray-900">New Listing</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Photo</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
              data-testid="photo-input"
            />
            {photoPreview ? (
              <div className="relative w-full h-48 rounded-xl overflow-hidden">
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setPhotoPreview(null);
                    setPhotoFile(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white hover:bg-black/70"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all"
                data-testid="photo-upload-btn"
              >
                <Upload size={24} className="text-gray-400" />
                <span className="text-sm text-gray-500">Click to upload a photo</span>
              </button>
            )}
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.filter((c) => c.name !== "Electronics").map((cat) => (
                <button
                  type="button"
                  key={cat.name}
                  onClick={() => handleCategorySelect(cat.name)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-xs font-medium ${
                    category === cat.name
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 text-gray-600 hover:border-emerald-200 hover:bg-emerald-50/50"
                  }`}
                  data-testid={`category-${cat.name.toLowerCase()}`}
                >
                  <CategoryIcon
                    category={cat.name}
                    size={20}
                    className={category === cat.name ? "text-emerald-600" : "text-gray-400"}
                  />
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Blocked categories section */}
            <div className="mt-3">
              <p className="text-xs text-gray-400 mb-1.5">Restricted items:</p>
              <div className="flex flex-wrap gap-1.5">
                {BLOCKED_CATEGORIES.map((bc) => (
                  <button
                    type="button"
                    key={bc}
                    onClick={() => handleCategorySelect(bc)}
                    className="px-2.5 py-1 text-xs bg-red-50 text-red-400 rounded-lg border border-red-100 hover:bg-red-100 transition-colors"
                  >
                    {bc}
                  </button>
                ))}
              </div>
            </div>

            {/* Blocked Message */}
            {showBlocked && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-700">{showBlocked} not accepted</p>
                  <p className="text-xs text-red-500 mt-0.5">
                    This item requires special disposal. Please contact your local waste management
                    service or visit your county's hazardous waste site for safe recycling options.
                  </p>
                </div>
              </div>
            )}

            {/* Prep Checklist */}
            {showChecklist && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                <ClipboardCheck size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-700">Prep checklist</p>
                  <ul className="mt-1 space-y-1">
                    <li className="flex items-center gap-1.5 text-xs text-amber-600">
                      <CheckCircle2 size={12} /> Drain all fluids before pickup
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe the metal type, approximate weight, and condition..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              data-testid="description-input"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
            <div className="relative">
              <MapPin
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter address or use current location"
                className="w-full rounded-xl border border-gray-300 pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                data-testid="address-input"
              />
            </div>
          </div>

          {submitError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {submitError}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 rounded-b-2xl">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!category || !description || submitting}
            className="w-full py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
            data-testid="submit-listing-btn"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="animate-spin" size={16} /> Creating...
              </span>
            ) : (
              "Post Listing"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
