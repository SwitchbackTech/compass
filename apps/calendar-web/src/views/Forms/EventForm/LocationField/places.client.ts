import { z } from "zod/v4";

export const PLACES_AUTOCOMPLETE_URL =
  "https://places.googleapis.com/v1/places:autocomplete";

const PlacesAutocompleteResponseSchema = z.object({
  suggestions: z
    .array(
      z.object({
        placePrediction: z
          .object({ text: z.object({ text: z.string() }) })
          .optional(),
      }),
    )
    .optional(),
});

/**
 * Address suggestions from Places API (New) Autocomplete. Only the
 * prediction text is requested: the event location is a plain string, so
 * there is no Place Details call. Throws on a non-OK response.
 */
export async function fetchPlaceSuggestions(
  input: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<string[]> {
  const response = await fetch(PLACES_AUTOCOMPLETE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "suggestions.placePrediction.text.text",
    },
    body: JSON.stringify({ input }),
    signal,
  });
  if (!response.ok) {
    throw new Error(`Places autocomplete failed: ${response.status}`);
  }

  const { suggestions = [] } = PlacesAutocompleteResponseSchema.parse(
    await response.json(),
  );
  return suggestions.flatMap((suggestion) =>
    suggestion.placePrediction ? [suggestion.placePrediction.text.text] : [],
  );
}
