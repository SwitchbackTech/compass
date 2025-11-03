import {
  Schema_Event,
  Schema_SomedayEvent,
  SomedayEventSchema,
} from "@core/types/event.types";

export const validateSomedayEvents = (
  events: Schema_Event[],
): Schema_SomedayEvent[] => {
  return SomedayEventSchema.array().parse(events);
};

export const validateSomedayEvent = (
  event: Schema_Event,
): Schema_SomedayEvent => {
  return validateSomedayEvents([event]).pop()!;
};
