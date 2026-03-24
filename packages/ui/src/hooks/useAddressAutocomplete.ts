import { useCallback, useEffect, useRef, useState } from "react";

export interface AddressSuggestion {
  label: string;
  lat: number;
  lng: number;
}

interface UseAddressAutocompleteReturn {
  suggestions: AddressSuggestion[];
  loading: boolean;
  selectSuggestion: (suggestion: AddressSuggestion) => void;
  clearSuggestions: () => void;
  search: (query: string) => void;
}

function formatLabel(props: Record<string, unknown>): string {
  const parts: string[] = [];
  const housenumber = props.housenumber as string | undefined;
  const street = props.street as string | undefined;
  const city = props.city as string | undefined;
  const state = props.state as string | undefined;

  if (housenumber && street) {
    parts.push(`${housenumber} ${street}`);
  } else if (street) {
    parts.push(street);
  }

  if (city) {
    parts.push(city);
  }

  if (state) {
    parts.push(state);
  }

  return parts.join(", ") || "Unknown location";
}

export function useAddressAutocomplete(): UseAddressAutocompleteReturn {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  const selectSuggestion = useCallback((_suggestion: AddressSuggestion) => {
    setSuggestions([]);
  }, []);

  const search = useCallback((query: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (abortRef.current) {
      abortRef.current.abort();
    }

    if (query.length < 3) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const params = new URLSearchParams({
          q: query,
          lat: "44.9778",
          lon: "-93.2650",
          limit: "5",
          lang: "en",
        });
        const res = await fetch(`https://photon.komoot.io/api/?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = await res.json();

        const results: AddressSuggestion[] = (
          data.features as Array<{
            properties: Record<string, unknown>;
            geometry: { coordinates: [number, number] };
          }>
        ).map((feature) => ({
          label: formatLabel(feature.properties),
          // Photon returns [lng, lat] — swap!
          lat: feature.geometry.coordinates[1],
          lng: feature.geometry.coordinates[0],
        }));

        setSuggestions(results);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setSuggestions([]);
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

  return { suggestions, loading, selectSuggestion, clearSuggestions, search };
}
