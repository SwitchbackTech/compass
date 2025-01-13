import { CoreEventSchema, Schema_Event } from "@core/types/event.types";

export const validateEvent = (event: Schema_Event) => {
  const result = CoreEventSchema.parse(event);
  return result;
};
