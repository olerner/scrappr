import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  MapPin,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createListing, getAddresses, getPresignedUrl, uploadPhoto } from "../api/client";
import { AddressPicker } from "../components/AddressPicker";
import { CategoryIcon } from "../components/CategoryIcon";
import { PhotoUpload } from "../components/PhotoUpload";
import { BLOCKED_CATEGORIES, CATEGORIES, PREP_CHECKLIST_CATEGORIES } from "../data/mockData";
import {
  type Address,
  ALLOWED_AREA_LABEL,
  type BlockedCategory,
  type Category,
  isAllowedZip,
} from "../data/types";

import { useAuthContext } from "../contexts/AuthContext";
import { useStore } from "../store/useStore";

export function CreateListing() {
  const navigate = useNavigate();
  const { accessToken, isAuthenticated, isLoading: authLoading } = useAuthContext();

  const { addresses, addressesLoaded, setAddresses } = useStore();
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  const [category, setCategory] = useState<Category | "">("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [zipError, setZipError] = useState<string | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [showBlocked, setShowBlocked] = useState<string | null>(null);
  const [showChecklist, setShowChecklist] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState(false);
  const [attempted, setAttempted] = useState(false);

  // Load saved addresses
  useEffect(() => {
    if (addressesLoaded || !accessToken) return;
    setAddressesLoading(true);
    getAddresses(accessToken)
      .then((data) => {
        const mapped: Address[] = (data.addresses || []).map((item: Record<string, unknown>) => ({
          addressId: item.addressId as string,
          label: item.label as string,
          address: item.address as string,
          lat: item.lat as number,
          lng: item.lng as number,
          zipCode: item.zipCode as string,
          isDefault: item.isDefault as boolean,
          createdAt: item.createdAt as string,
        }));
        setAddresses(mapped);
      })
      .finally(() => setAddressesLoading(false));
  }, [accessToken, addressesLoaded, setAddresses]);

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
    },
    [validateZip],
  );

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

  const handleSubmit = async () => {
    if (!accessToken) return;
    setAttempted(true);
    if (!photoFile) setPhotoError(true);
    if (!zipCode || !isAllowedZip(zipCode)) {
      if (zipCode) {
        setZipError(
          `Scrappr is currently only available in ${ALLOWED_AREA_LABEL}. We're starting small to make sure everything works great before expanding!`,
        );
      }
    }
    if (!photoFile || !category || !description || !address || !zipCode || !isAllowedZip(zipCode))
      return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const presign = await getPresignedUrl(accessToken, photoFile.type);
      await uploadPhoto(presign.uploadUrl, photoFile, presign.fields);

      const catInfo = CATEGORIES.find((c) => c.name === category);

      await createListing(accessToken, {
        category: category as string,
        description,
        photoUrl: presign.photoUrl,
        lat: lat as number,
        lng: lng as number,
        address,
        zipCode: zipCode.trim(),
        estimatedValue: catInfo?.payoutLabel || "Varies",
      });

      navigate("/list");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create listing");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          to="/list"
          className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 text-sm mb-4"
        >
          <ArrowLeft size={16} /> Back to My Listings
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-1">Create a New Scrap Metal Listing</h1>
        <p className="text-gray-500 text-sm mb-8">
          Fill out the form below to list your scrap metal for pickup
        </p>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
          {/* Zip Code Notice */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
            <MapPin size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-700">Limited availability</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Scrappr is currently only available in {ALLOWED_AREA_LABEL}. We're starting small to
                make sure everything works great before expanding!
              </p>
            </div>
          </div>

          {/* Photo Upload */}
          <PhotoUpload
            onFileChange={(file) => {
              setPhotoFile(file);
              if (file) setPhotoError(false);
            }}
            error={photoError}
          />

          {/* Category Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
              {attempted && !category && (
                <span className="text-red-500 ml-2 font-normal">Required</span>
              )}
            </label>
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
                  {cat.displayName ?? cat.name}
                </button>
              ))}
            </div>

            {/* Blocked categories */}
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
              {attempted && !description && (
                <span className="text-red-500 ml-2 font-normal">Required</span>
              )}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe the metal type, approximate weight, and condition..."
              className={`w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none ${
                attempted && !description ? "border-red-300" : "border-gray-300"
              }`}
              data-testid="description-input"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
              {attempted && !address && (
                <span className="text-red-500 ml-2 font-normal">Required</span>
              )}
            </label>
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

          {/* Validation hints */}
          {(() => {
            const missing = [];
            if (!photoFile) missing.push("photo");
            if (!category) missing.push("category");
            if (!description) missing.push("description");
            if (!address || !zipCode) missing.push("location");
            if (missing.length > 0 && (photoFile || category || description || address)) {
              return <p className="text-xs text-gray-400">Still needed: {missing.join(", ")}</p>;
            }
            return null;
          })()}

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              !category ||
              !description ||
              !photoFile ||
              !address ||
              !zipCode ||
              !!zipError ||
              submitting
            }
            className="w-full py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
            data-testid="submit-listing-btn"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="animate-spin" size={16} /> Creating...
              </span>
            ) : (
              "Create Listing"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
