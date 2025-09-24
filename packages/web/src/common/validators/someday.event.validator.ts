import {
  Schema_SomedayEvent,
  Schema_WebEvent,
  SomedayEventSchema,
} from "../types/web.event.types";

export const validateSomedayEvent = (
  event: Schema_WebEvent,
): Schema_SomedayEvent => {
  const result = SomedayEventSchema.parse(event);
  return result;
};

export const validateSomedayEvents = (
  events: Schema_WebEvent[],
): Schema_SomedayEvent[] => {
  const results = events.map((event) => validateSomedayEvent(event));
  return results;
};
