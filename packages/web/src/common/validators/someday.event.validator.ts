import { Schema_Event } from "@core/types/event.types";
import { SomedayEventSchema } from "../types/web.event.types";

export const validateSomedayEvent = (event: Schema_Event) => {
  const result = SomedayEventSchema.parse(event);
  return result;
};

export const validateSomedayEvents = (events: Schema_Event[]) => {
  const results = events.map((event) => validateSomedayEvent(event));
  return results;
};
