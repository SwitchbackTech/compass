import { Schema_Event } from "@core/types/event.types";
import {
  Schema_SomedayEvent,
  SomedayEventSchema,
} from "../types/web.event.types";

export const validateSomedayEvent = (
  event: Schema_Event,
): Schema_SomedayEvent => {
  const result = SomedayEventSchema.parse(event);
  return result;
};

export const validateSomedayEvents = (
  events: Schema_Event[],
): Schema_SomedayEvent[] => {
  const results = events.map((event) => validateSomedayEvent(event));
  return results;
};
