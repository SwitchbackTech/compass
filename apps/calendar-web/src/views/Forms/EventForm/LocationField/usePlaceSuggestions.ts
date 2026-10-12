import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { fetchPlaceSuggestions } from "@web/views/Forms/EventForm/LocationField/places.client";

export const PLACE_SUGGESTION_DEBOUNCE_MS = 250;
export const PLACE_SUGGESTION_MIN_LENGTH = 3;
const PLACE_SUGGESTION_STALE_TIME_MS = 5 * 60 * 1000;
const NO_SUGGESTIONS: string[] = [];

/**
 * Debounced Places suggestions for `query`. Disabled without an API key or
 * under the minimum length. Any failure yields no suggestions: they are a
 * convenience, and free typing keeps working.
 */
export function usePlaceSuggestions(
  query: string,
  apiKey: string | undefined,
): string[] {
  const [debouncedQuery, setDebouncedQuery] = useState(query.trim());

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedQuery(query.trim()),
      PLACE_SUGGESTION_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [query]);

  const { data } = useQuery({
    queryKey: ["place-suggestions", debouncedQuery],
    queryFn: ({ signal }) =>
      fetchPlaceSuggestions(debouncedQuery, apiKey ?? "", signal),
    enabled:
      Boolean(apiKey) && debouncedQuery.length >= PLACE_SUGGESTION_MIN_LENGTH,
    staleTime: PLACE_SUGGESTION_STALE_TIME_MS,
    retry: false,
  });

  return data ?? NO_SUGGESTIONS;
}
