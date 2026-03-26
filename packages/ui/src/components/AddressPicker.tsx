import { MapPin, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import type { Address } from "../data/types";
import { AddressBook } from "./AddressBook";

interface AddressPickerProps {
  addresses: Address[];
  selectedAddressId: string | null;
  onSelect: (address: Address) => void;
  loading?: boolean;
}

export function AddressPicker({
  addresses,
  selectedAddressId,
  onSelect,
  loading,
}: AddressPickerProps) {
  const [showManage, setShowManage] = useState(false);

  // Auto-select default or only address
  useEffect(() => {
    if (selectedAddressId || addresses.length === 0) return;
    const defaultAddr = addresses.find((a) => a.isDefault) || addresses[0];
    if (defaultAddr) onSelect(defaultAddr);
  }, [addresses, selectedAddressId, onSelect]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400 py-3">
        <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        Loading addresses...
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {addresses.length > 0 ? (
          <select
            value={selectedAddressId || ""}
            onChange={(e) => {
              const addr = addresses.find((a) => a.addressId === e.target.value);
              if (addr) onSelect(addr);
            }}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
          >
            {addresses.map((addr) => (
              <option key={addr.addressId} value={addr.addressId}>
                {addr.label ? `${addr.label} — ${addr.address}` : addr.address}
              </option>
            ))}
          </select>
        ) : !showManage ? (
          <button
            type="button"
            onClick={() => setShowManage(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-600 hover:border-emerald-400 hover:text-emerald-600 transition-colors w-full justify-center"
          >
            <MapPin size={16} /> Add a pickup address
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => setShowManage(true)}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600"
        >
          <Settings size={12} /> Manage addresses
        </button>
      </div>

      {showManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowManage(false)}
          />
          <div className="relative w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <AddressBook initialShowAdd={addresses.length === 0} />
            <div className="flex justify-end mt-3">
              <button
                type="button"
                onClick={() => setShowManage(false)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
