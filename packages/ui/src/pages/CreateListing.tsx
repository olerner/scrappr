import { DESCRIPTION_MAX_LENGTH } from "@scrappr/shared/src/constants";
import { AlertTriangle, ArrowLeft, Loader2, MapPin } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createListing, getPresignedUrl, updateProfile, uploadPhoto } from "../api/client";
import { AddressPicker } from "../components/AddressPicker";
import { CategorySelector } from "../components/CategorySelector";
import { PhoneSharingField } from "../components/PhoneSharingField";
import { PhotoUpload } from "../components/PhotoUpload";
import { CATEGORIES } from "../data/mockData";
import {
  type Address,
  ALLOWED_AREA_LABEL,
  type Category,
  formatPhoneForDisplay,
  isAllowedZip,
  isValidPhone,
  normalizePhone,
} from "../data/types";
import { useAuth } from "../hooks/useAuth";
import { useLoadAddresses } from "../hooks/useLoadAddresses";
import { useLoadProfile } from "../hooks/useLoadProfile";
import { useStore } from "../store/useStore";

export function CreateListing() {
  const navigate = useNavigate();
  const { accessToken } = useAuth();

  const { addresses, loading: addressesLoading } = useLoadAddresses(accessToken);
  const { profile } = useLoadProfile(accessToken);
  const setProfile = useStore((s) => s.setProfile);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  const [category, setCategory] = useState<Category | "">("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [zipError, setZipError] = useState<string | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [sharePhone, setSharePhone] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);

  // Auto-fill phone and opt-in state from the user's saved profile.
  useEffect(() => {
    if (!profile?.phone || phoneTouched) return;
    setPhone(formatPhoneForDisplay(profile.phone));
    setSharePhone(true);
  }, [profile, phoneTouched]);

  const phoneInvalid = sharePhone && !isValidPhone(phone);

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
    if (phoneInvalid) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const presign = await getPresignedUrl(accessToken, photoFile.type);
      await uploadPhoto(presign.uploadUrl, photoFile, presign.fields);

      const catInfo = CATEGORIES.find((c) => c.name === category);
      const normalizedPhone = sharePhone && phone ? normalizePhone(phone) : "";

      await createListing(accessToken, {
        category: category as string,
        description,
        photoUrl: presign.photoUrl,
        lat: lat as number,
        lng: lng as number,
        address,
        zipCode: zipCode.trim(),
        estimatedValue: catInfo?.payoutLabel || "Varies",
        sharePhone,
        phone: normalizedPhone,
      });

      // Save phone to the user profile so future listings auto-fill it.
      if (sharePhone && normalizedPhone && normalizedPhone !== profile?.phone) {
        try {
          const res = await updateProfile(accessToken, { phone: normalizedPhone });
          setProfile(res.profile);
        } catch {
          // Non-fatal — the listing was created successfully.
        }
      }

      navigate("/list");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to create listing");
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

          <CategorySelector
            selected={category}
            onSelect={(cat) => setCategory(cat)}
            showRequired={attempted}
          />

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
              onChange={(e) => {
                if (e.target.value.length <= DESCRIPTION_MAX_LENGTH) {
                  setDescription(e.target.value);
                }
              }}
              maxLength={DESCRIPTION_MAX_LENGTH}
              rows={3}
              placeholder="Describe the metal type, approximate weight, and condition..."
              className={`w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none ${
                attempted && !description ? "border-red-300" : "border-gray-300"
              }`}
              data-testid="description-input"
            />
            <p
              className={`text-xs mt-1 text-right ${description.length >= DESCRIPTION_MAX_LENGTH ? "text-red-500" : "text-gray-400"}`}
            >
              {description.length} / {DESCRIPTION_MAX_LENGTH}
            </p>
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

          <PhoneSharingField
            sharePhone={sharePhone}
            phone={phone}
            invalid={phoneInvalid}
            showError={attempted}
            onShareChange={(value) => {
              setSharePhone(value);
              setPhoneTouched(true);
            }}
            onPhoneChange={(value) => {
              setPhone(value);
              setPhoneTouched(true);
            }}
          />

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
              phoneInvalid ||
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
