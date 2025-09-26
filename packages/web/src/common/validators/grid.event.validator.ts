import {
  GridEventSchema,
  Schema_GridEvent,
  Schema_WebEvent,
} from "@web/common/types/web.event.types";

export const validateGridEvent = (event: Schema_WebEvent): Schema_GridEvent => {
  const result = GridEventSchema.parse(event) as Schema_GridEvent;

  return result;
};
