import { Schema_Event } from "@core/types/event.types";
import {
  GridEventSchema,
  Schema_GridEvent,
} from "@web/common/types/web.event.types";

export const validateGridEvent = (event: Schema_Event): Schema_GridEvent => {
  const result = GridEventSchema.parse(event) as Schema_GridEvent;

  return result;
};
