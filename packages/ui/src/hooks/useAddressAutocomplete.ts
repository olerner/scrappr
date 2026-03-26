import { useCallback, useEffect, useRef, useState } from "react";

const GOOGLE_PLACES_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY ?? "";

export interface AddressSuggestion {
  label: string;
  lat: number;
  lng: number;
  zipCode: string;
  city: string;
}

export interface PlacePrediction {
  label: string;
  placeId: string;
}

interface UseAddressAutocompleteReturn {
  predictions: PlacePrediction[];
  loading: boolean;
  clearPredictions: () => void;
  search: (query: string) => void;
}

async function fetchAutocomplete(query: string, signal: AbortSignal): Promise<PlacePrediction[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
      "X-Goog-FieldMask": "suggestions.placePrediction.text,suggestions.placePrediction.placeId",
    },
    body: JSON.stringify({
      input: query,
      includedRegionCodes: ["us"],
      includedPrimaryTypes: ["street_address", "subpremise", "premise"],
      languageCode: "en",
    }),
    signal,
  });

  const data = await res.json();

  if (!data.suggestions) return [];

  return (
    data.suggestions as Array<{
      placePrediction?: { text?: { text?: string }; placeId?: string };
    }>
  )
    .filter((s) => s.placePrediction?.text?.text && s.placePrediction?.placeId)
    .map((s) => ({
      label: s.placePrediction!.text!.text!,
      placeId: s.placePrediction!.placeId!,
    }));
}

export async function fetchPlaceDetails(
  placeId: string,
  signal?: AbortSignal,
): Promise<AddressSuggestion> {
  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
      "X-Goog-FieldMask": "location,formattedAddress,addressComponents",
    },
    signal,
  });

  const data = await res.json();

  const components = data.addressComponents as
    | Array<{ types: string[]; shortText?: string; longText?: string }>
    | undefined;

  const postalComponent = components?.find((c) => c.types?.includes("postal_code"));
  const cityComponent = components?.find((c) => c.types?.includes("locality"));

  return {
    lat: data.location?.latitude ?? 0,
    lng: data.location?.longitude ?? 0,
    label: data.formattedAddress ?? "",
    zipCode: postalComponent?.shortText ?? "",
    city: cityComponent?.longText ?? "",
  };
}

export function useAddressAutocomplete(): UseAddressAutocompleteReturn {
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPredictions = useCallback(() => {
    setPredictions([]);
  }, []);

  const search = useCallback((query: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (abortRef.current) {
      abortRef.current.abort();
    }

    if (query.length < 3) {
      setPredictions([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const results = await fetchAutocomplete(query, controller.signal);
        setPredictions(results);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setPredictions([]);
        }
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  return { predictions, loading, clearPredictions, search };
}
