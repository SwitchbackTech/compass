import { Event_Core, Schema_Event } from "@core/types/event.types";

export const validateEvent = (event: Schema_Event): Event_Core => {
  const result = EventSchema.parse(event);
  return result;
};
