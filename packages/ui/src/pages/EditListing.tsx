import { DESCRIPTION_MAX_LENGTH } from "@scrappr/shared/src/constants";
import { AlertTriangle, ArrowLeft, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  deleteListing,
  getMyListings,
  getPresignedUrl,
  updateListing,
  uploadPhoto,
} from "../api/client";
import { AddressPicker } from "../components/AddressPicker";
import { CategorySelector } from "../components/CategorySelector";
import { PhotoUpload } from "../components/PhotoUpload";
import { CATEGORIES } from "../data/mockData";
import {
  type Address,
  ALLOWED_AREA_LABEL,
  type Category,
  isAllowedZip,
  type Listing,
} from "../data/types";
import { useAuth } from "../hooks/useAuth";
import { useLoadAddresses } from "../hooks/useLoadAddresses";

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
      const found = (data.listings || []).find((item) => item.listingId === id);
      if (found) {
        setListing(found);
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
    sessionStorage.setItem("scrappr_return_path", window.location.pathname);
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
            <ArrowLeft size={16} /> Back to My Listings
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
            <ArrowLeft size={16} /> Back to My Listings
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
  const { addresses, loading: addressesLoading } = useLoadAddresses(accessToken);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Try to match listing's current address to a saved address
  const matchingAddress = addresses.find(
    (a) => a.address === listing.address && a.lat === listing.lat && a.lng === listing.lng,
  );
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    matchingAddress?.addressId ?? null,
  );

  const [category, setCategory] = useState<Category | "">(listing.category);
  const [description, setDescription] = useState(listing.description);
  const [address, setAddress] = useState(listing.address);
  const [zipCode, setZipCode] = useState("");
  const [zipError, setZipError] = useState<string | null>(null);
  const [lat, setLat] = useState<number | null>(listing.lat);
  const [lng, setLng] = useState<number | null>(listing.lng);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoDeleted, setPhotoDeleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [userEdited, setUserEdited] = useState(false);

  const validateZip = useCallback((zip: string) => {
    if (zip && !isAllowedZip(zip)) {
      setZipError(
        `Scrappr is currently only available in ${ALLOWED_AREA_LABEL}. We're starting small to make sure everything works great before expanding!`,
      );
    } else {
      setZipError(null);
    }
  }, []);

  const handleAddressSelect = useCallback(
    (addr: Address) => {
      setSelectedAddressId(addr.addressId);
      setAddress(addr.address);
      setLat(addr.lat);
      setLng(addr.lng);
      setZipCode(addr.zipCode);
      validateZip(addr.zipCode);
      if (
        addr.address !== listing.address ||
        addr.lat !== listing.lat ||
        addr.lng !== listing.lng
      ) {
        setUserEdited(true);
      }
    },
    [validateZip, listing],
  );

  const handleSubmit = async () => {
    if (!category || !description) return;
    if (photoDeleted && !photoFile) return;
    if (zipCode && !isAllowedZip(zipCode)) {
      setZipError(
        `Scrappr is currently only available in ${ALLOWED_AREA_LABEL}. We're starting small to make sure everything works great before expanding!`,
      );
      return;
    }
    setSubmitting(true);
    setSubmitError(null);

    try {
      let photoUrl: string | undefined;

      if (photoFile) {
        const presign = await getPresignedUrl(accessToken, photoFile.type);
        await uploadPhoto(presign.uploadUrl, photoFile, presign.fields);
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

      await updateListing(accessToken, listing.listingId, payload);
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
          <ArrowLeft size={16} /> Back to My Listings
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
                    onClick={() => {
                      setPhotoDeleted(true);
                      setUserEdited(true);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full text-white hover:bg-black/70"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <PhotoUpload
                onFileChange={(file) => {
                  setPhotoFile(file);
                  if (file) setUserEdited(true);
                }}
                error={photoDeleted && !photoFile}
              />
            )}
          </div>

          <CategorySelector
            selected={category}
            onSelect={(cat) => {
              setCategory(cat);
              setUserEdited(true);
            }}
          />

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => {
                if (e.target.value.length <= DESCRIPTION_MAX_LENGTH) {
                  setDescription(e.target.value);
                  setUserEdited(true);
                }
              }}
              maxLength={DESCRIPTION_MAX_LENGTH}
              rows={3}
              placeholder="Describe the metal type, approximate weight, and condition..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
            />
            <p
              className={`text-xs mt-1 text-right ${description.length >= DESCRIPTION_MAX_LENGTH ? "text-red-500" : "text-gray-400"}`}
            >
              {description.length} / {DESCRIPTION_MAX_LENGTH}
            </p>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
            {!selectedAddressId && address && (
              <p className="text-sm text-gray-600 mb-2">Current: {address}</p>
            )}
            <AddressPicker
              addresses={addresses}
              selectedAddressId={selectedAddressId}
              onSelect={handleAddressSelect}
              loading={addressesLoading}
            />
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
              !category ||
              !description ||
              (photoDeleted && !photoFile) ||
              !!zipError ||
              !userEdited ||
              submitting
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

          {/* Delete */}
          <button
            type="button"
            disabled={deleting}
            onClick={async () => {
              if (!confirmDelete) {
                setConfirmDelete(true);
                return;
              }
              setDeleting(true);
              try {
                await deleteListing(accessToken, listing.listingId);
                navigate("/list");
              } catch {
                setDeleting(false);
                setConfirmDelete(false);
              }
            }}
            onBlur={() => setConfirmDelete(false)}
            className={`w-full py-3 font-semibold rounded-xl transition-all disabled:opacity-40 ${
              confirmDelete
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-white text-red-600 border border-red-200 hover:bg-red-50"
            }`}
          >
            {deleting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="animate-spin" size={16} /> Deleting...
              </span>
            ) : confirmDelete ? (
              "Click again to confirm delete"
            ) : (
              "Delete Listing"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
