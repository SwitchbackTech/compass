import { EventSchema, Schema_Event } from "@core/types/event.types";

export const validateEvent = (event: Schema_Event): Schema_Event => {
  const result = EventSchema.parse(event);
  return result;
};
