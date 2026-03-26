import { Loader2, MapPin, Plus, Star, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  createAddress,
  deleteAddress as deleteAddressApi,
  getAddresses,
  updateAddress as updateAddressApi,
} from "../api/client";
import type { Address } from "../data/types";
import { ALLOWED_AREA_LABEL, ALLOWED_CITY } from "../data/types";
import type { AddressSuggestion } from "../hooks/useAddressAutocomplete";
import { useAuthContext } from "../hooks/useAuth";
import { useStore } from "../store/useStore";
import { AddressAutocomplete } from "./AddressAutocomplete";

interface AddressBookProps {
  initialShowAdd?: boolean;
}

export function AddressBook({ initialShowAdd = false }: AddressBookProps) {
  const { accessToken: token } = useAuthContext();
  const accessToken = token!;
  const { addresses, addressesLoaded, setAddresses, addAddress, updateAddress, removeAddress } =
    useStore();
  const [showAdd, setShowAdd] = useState(initialShowAdd);
  const [pendingSuggestion, setPendingSuggestion] = useState<AddressSuggestion | null>(null);
  const [saving, setSaving] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (addressesLoaded) return;
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
      .catch(() => setError("Failed to load addresses"));
  }, [accessToken, addressesLoaded, setAddresses]);

  const handleAutocompleteSelect = useCallback(
    (suggestion: AddressSuggestion) => {
      setPendingSuggestion(suggestion);
      if (!suggestion.city || suggestion.city !== ALLOWED_CITY) {
        setZipError(
          `Scrappr is currently only available in ${ALLOWED_AREA_LABEL}. This address can't be saved.`,
        );
      } else if (addresses.some((a) => a.address === suggestion.label)) {
        setZipError("This address is already saved.");
      } else {
        setZipError(null);
      }
    },
    [addresses],
  );

  const handleConfirmSave = useCallback(async () => {
    if (!pendingSuggestion) return;
    setSaving(true);
    setError(null);
    try {
      const result = await createAddress(accessToken, {
        label: "",
        address: pendingSuggestion.label,
        lat: pendingSuggestion.lat,
        lng: pendingSuggestion.lng,
        zipCode: pendingSuggestion.zipCode,
      });
      addAddress({
        addressId: result.addressId as string,
        label: result.label as string,
        address: result.address as string,
        lat: result.lat as number,
        lng: result.lng as number,
        zipCode: result.zipCode as string,
        isDefault: result.isDefault as boolean,
        createdAt: result.createdAt as string,
      });
      setShowAdd(false);
      setPendingSuggestion(null);
    } catch {
      setError("Failed to save address");
    } finally {
      setSaving(false);
    }
  }, [accessToken, addAddress, pendingSuggestion]);

  const handleSetDefault = useCallback(
    async (addressId: string) => {
      setError(null);
      const previousDefault = addresses.find((a) => a.isDefault);
      updateAddress(addressId, { isDefault: true });
      try {
        await updateAddressApi(accessToken, addressId, { isDefault: true });
      } catch {
        if (previousDefault) {
          updateAddress(previousDefault.addressId, { isDefault: true });
        }
        updateAddress(addressId, { isDefault: false });
        setError("Failed to update default address");
      }
    },
    [accessToken, addresses, updateAddress],
  );

  const handleDelete = useCallback(
    async (addressId: string) => {
      setError(null);
      // Optimistic — remove from UI immediately
      const deletedAddr = addresses.find((a) => a.addressId === addressId);
      removeAddress(addressId);
      try {
        await deleteAddressApi(accessToken, addressId);
      } catch {
        // Revert on failure
        if (deletedAddr) {
          addAddress(deletedAddr);
        }
        setError("Failed to delete address");
      }
    },
    [accessToken, addresses, addAddress, removeAddress],
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Saved Addresses</h2>

      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Add section — always at the top */}
      {showAdd ? (
        <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
          <p className="text-xs text-gray-400">Currently serving {ALLOWED_AREA_LABEL} only</p>
          <AddressAutocomplete onSelect={handleAutocompleteSelect} autoFocus={initialShowAdd} />
          {zipError && <p className="text-sm text-red-600">{zipError}</p>}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setShowAdd(false);
                setZipError(null);
                setPendingSuggestion(null);
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmSave}
              disabled={!pendingSuggestion || saving || !!zipError}
              className="px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-600 hover:border-emerald-400 hover:text-emerald-600 transition-colors w-full justify-center mb-4"
        >
          <Plus size={16} /> Add address
        </button>
      )}

      {/* Address list */}
      <div className="space-y-2">
        {addresses.map((addr) => (
          <div
            key={addr.addressId}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
          >
            <MapPin size={14} className="text-gray-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-gray-900 truncate">{addr.address}</span>
                {addr.isDefault && (
                  <span className="inline-flex items-center gap-0.5 text-xs text-amber-600 font-medium flex-shrink-0">
                    <Star size={10} className="fill-amber-500" /> Default
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {!addr.isDefault && (
                <button
                  type="button"
                  onClick={() => handleSetDefault(addr.addressId)}
                  title="Set as default"
                  className="p-1.5 text-gray-400 hover:text-amber-500 transition-colors"
                >
                  <Star size={14} />
                </button>
              )}
              <button
                type="button"
                onClick={() => handleDelete(addr.addressId)}
                title="Delete address"
                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
