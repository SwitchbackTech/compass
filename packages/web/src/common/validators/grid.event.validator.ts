import { Schema_Event } from "@core/types/event.types";
import { GridEventSchema } from "../types/web.event.types";

export const validateGridEvent = (event: Schema_Event) => {
  const result = GridEventSchema.parse(event);
  return result;
};
