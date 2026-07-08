import {
  type CompassCoreEvent,
  CompassCoreEventSchema,
  type Schema_Event,
} from "@core/types/event.types";

/**
 * Validates an outbound event against `CompassCoreEventSchema` — the same
 * schema the backend parses request bodies with — so requests carry exactly
 * what the API expects. Zod parsing strips everything else automatically
 * (grid layout state like `position`, someday `order`, local-store markers).
 */
export const validateApiEvent = (event: Schema_Event): CompassCoreEvent => {
  const result = CompassCoreEventSchema.parse(event);
  return result;
};

export const validateApiEvents = (
  events: Schema_Event[],
): CompassCoreEvent[] => {
  const results = events.map((event) => validateApiEvent(event));
  return results;
};
