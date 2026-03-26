import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardCheck, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getMyListings, getPresignedUrl, updateListing, uploadPhoto } from "../api/client";
import { AddressAutocomplete } from "../components/AddressAutocomplete";
import { CategoryIcon } from "../components/CategoryIcon";
import { PhotoUpload } from "../components/PhotoUpload";
import { BLOCKED_CATEGORIES, CATEGORIES, PREP_CHECKLIST_CATEGORIES } from "../data/mockData";
import type { BlockedCategory, Category, Listing } from "../data/types";
import type { AddressSuggestion } from "../hooks/useAddressAutocomplete";
import { useAuth } from "../hooks/useAuth";

export function EditListing() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { accessToken, isAuthenticated, isLoading: authLoading } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchListing = useCallback(async () => {
    if (!accessToken || !id) return;
    try {
      const data = await getMyListings(accessToken);
      const found = (data.listings || []).find(
        (item: Record<string, unknown>) => item.listingId === id,
      );
      if (found) {
        setListing({
          id: (found.listingId as string) || "",
          category: (found.category as Category) || "Mixed",
          description: (found.description as string) || "",
          photoUrl: (found.photoUrl as string) || "",
          lat: (found.lat as number) || 0,
          lng: (found.lng as number) || 0,
          address: (found.address as string) || "",
          status: (found.status as Listing["status"]) || "available",
          datePosted: (found.datePosted as string) || "",
          estimatedValue: (found.estimatedValue as string) || "Varies",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [accessToken, id]);

  useEffect(() => {
    if (isAuthenticated && accessToken) fetchListing();
  }, [isAuthenticated, accessToken, fetchListing]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-600" size={32} />
      </div>
    );
  }

  if (!isAuthenticated) {
    navigate("/list");
    return null;
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Link
            to="/list"
            className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 text-sm mb-4"
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
          <p className="text-gray-500">Listing not found.</p>
        </div>
      </div>
    );
  }

  if (listing.status !== "available") {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Link
            to="/list"
            className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 text-sm mb-4"
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
          <p className="text-gray-500">
            This listing can no longer be edited because it has been claimed.
          </p>
        </div>
      </div>
    );
  }

  return <EditListingForm accessToken={accessToken!} listing={listing} />;
}

function EditListingForm({ accessToken, listing }: { accessToken: string; listing: Listing }) {
  const navigate = useNavigate();

  const [category, setCategory] = useState<Category | "">(listing.category);
  const [description, setDescription] = useState(listing.description);
  const [address, setAddress] = useState(listing.address);
  const [zipCode, setZipCode] = useState("");
  const [zipError, setZipError] = useState<string | null>(null);
  const [lat, setLat] = useState<number | null>(listing.lat);
  const [lng, setLng] = useState<number | null>(listing.lng);
  const [addressSelected, setAddressSelected] = useState(true);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoDeleted, setPhotoDeleted] = useState(false);
  const [showBlocked, setShowBlocked] = useState<string | null>(null);
  const [showChecklist, setShowChecklist] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleCategorySelect = (cat: string) => {
    if (BLOCKED_CATEGORIES.includes(cat as BlockedCategory)) {
      setShowBlocked(cat);
      setCategory("");
      return;
    }
    setShowBlocked(null);
    setCategory(cat as Category);
    setShowChecklist(PREP_CHECKLIST_CATEGORIES.includes(cat as Category));
  };

  const ALLOWED_ZIP = "55426";

  const validateZip = (zip: string) => {
    if (zip && zip !== ALLOWED_ZIP) {
      setZipError(
        `Scrappr is currently only available in zip code ${ALLOWED_ZIP}. We're starting small to make sure everything works great before expanding!`,
      );
    } else {
      setZipError(null);
    }
  };

  const handleSubmit = async () => {
    if (!category || !description) return;
    if (photoDeleted && !photoFile) return;
    if (zipCode && zipCode.trim() !== ALLOWED_ZIP) {
      setZipError(
        `Scrappr is currently only available in zip code ${ALLOWED_ZIP}. We're starting small to make sure everything works great before expanding!`,
      );
      return;
    }
    setSubmitting(true);
    setSubmitError(null);

    try {
      let photoUrl: string | undefined;

      if (photoFile) {
        const presign = await getPresignedUrl(accessToken, photoFile.type);
        await uploadPhoto(presign.uploadUrl, photoFile);
        photoUrl = presign.photoUrl;
      }

      const catInfo = CATEGORIES.find((c) => c.name === category);

      const payload: Record<string, unknown> = {
        category: category as string,
        description,
        estimatedValue: catInfo?.payoutLabel || "Varies",
      };

      if (photoUrl) payload.photoUrl = photoUrl;
      if (lat !== null) payload.lat = lat;
      if (lng !== null) payload.lng = lng;
      if (address) payload.address = address;
      if (zipCode) payload.zipCode = zipCode.trim();

      await updateListing(accessToken, listing.id, payload);
      navigate("/list");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to update listing");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          to="/list"
          className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 text-sm mb-4"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Edit Listing</h1>
        <p className="text-gray-500 text-sm mb-8">Update your listing details</p>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
          {/* Photo */}
          <div>
            {listing.photoUrl && !photoDeleted ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Photo</label>
                <div className="relative w-full h-48 rounded-xl overflow-hidden">
                  <img
                    src={listing.photoUrl}
                    alt={listing.category}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setPhotoDeleted(true)}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white hover:bg-black/70"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <PhotoUpload
                onFileChange={(file) => setPhotoFile(file)}
                error={photoDeleted && !photoFile}
              />
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
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
            <p className="text-xs text-gray-400 mb-2">Currently serving zip code 55426 only</p>
            {address && <p className="text-sm text-gray-600 mb-2">Current: {address}</p>}
            <AddressAutocomplete
              onSelect={(suggestion: AddressSuggestion) => {
                setAddress(suggestion.label);
                setLat(suggestion.lat);
                setLng(suggestion.lng);
                setZipCode(suggestion.zipCode);
                validateZip(suggestion.zipCode);
                setAddressSelected(true);
              }}
              warning={!addressSelected && address.length > 0}
            />
            <p className="text-xs text-gray-400 mt-1">
              Search for a new address to update the location, or leave as-is.
            </p>
          </div>

          {zipError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
              <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{zipError}</p>
            </div>
          )}

          {submitError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {submitError}
            </div>
          )}

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              !category || !description || (photoDeleted && !photoFile) || !!zipError || submitting
            }
            className="w-full py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="animate-spin" size={16} /> Saving...
              </span>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
