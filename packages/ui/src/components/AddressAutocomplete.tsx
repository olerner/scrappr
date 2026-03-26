import { MapPin } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type AddressSuggestion,
  fetchPlaceDetails,
  type PlacePrediction,
  useAddressAutocomplete,
} from "../hooks/useAddressAutocomplete";

interface AddressAutocompleteProps {
  onSelect: (suggestion: AddressSuggestion) => void;
  warning?: boolean;
}

export function AddressAutocomplete({ onSelect, warning }: AddressAutocompleteProps) {
  const { predictions, loading, clearPredictions, search } = useAddressAutocomplete();
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [resolving, setResolving] = useState(false);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setInputValue(val);
      setHighlightIndex(-1);
      search(val);
      setIsOpen(true);
    },
    [search],
  );

  const handleSelect = useCallback(
    async (prediction: PlacePrediction) => {
      setInputValue(prediction.label);
      clearPredictions();
      setIsOpen(false);
      setHighlightIndex(-1);
      setResolving(true);

      try {
        const details = await fetchPlaceDetails(prediction.placeId);
        onSelect(details);
      } catch {
        // If details fetch fails, still pass what we have
        onSelect({ label: prediction.label, lat: 0, lng: 0, zipCode: "" });
      } finally {
        setResolving(false);
      }
    },
    [clearPredictions, onSelect],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || predictions.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIndex((prev) => (prev < predictions.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex((prev) => (prev > 0 ? prev - 1 : predictions.length - 1));
      } else if (e.key === "Enter" && highlightIndex >= 0) {
        e.preventDefault();
        handleSelect(predictions[highlightIndex]);
      } else if (e.key === "Escape") {
        setIsOpen(false);
        clearPredictions();
      }
    },
    [isOpen, predictions, highlightIndex, handleSelect, clearPredictions],
  );

  const handleBlur = useCallback(() => {
    blurTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  }, []);

  const handleFocus = useCallback(() => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    if (predictions.length > 0) {
      setIsOpen(true);
    }
  }, [predictions.length]);

  useEffect(() => {
    if (predictions.length > 0) {
      setIsOpen(true);
    }
  }, [predictions]);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const items = listRef.current.children;
      if (items[highlightIndex]) {
        (items[highlightIndex] as HTMLElement).scrollIntoView({
          block: "nearest",
        });
      }
    }
  }, [highlightIndex]);

  const showWarning = warning && inputValue.length > 0;
  const isLoading = loading || resolving;

  return (
    <div className="relative">
      <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onFocus={handleFocus}
        placeholder="Enter address or use current location"
        className={`w-full rounded-xl border ${
          showWarning ? "border-amber-400 ring-2 ring-amber-200" : "border-gray-300"
        } pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
        data-testid="address-input"
      />
      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {isOpen && predictions.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-60 overflow-y-auto"
        >
          {predictions.map((prediction, index) => (
            <li key={prediction.placeId}>
              <button
                type="button"
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  index === highlightIndex
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(prediction);
                }}
                data-testid="address-suggestion"
              >
                <span className="flex items-center gap-2">
                  <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                  {prediction.label}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {showWarning && (
        <p className="text-amber-600 text-xs mt-1">Please select an address from the suggestions</p>
      )}
    </div>
  );
}
