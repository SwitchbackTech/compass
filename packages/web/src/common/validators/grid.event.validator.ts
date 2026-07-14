import {
  type GridEvent,
  GridEventSchema,
  type WebEvent,
} from "@web/common/types/web.event.types";

export const validateGridEvent = (event: WebEvent): GridEvent => {
  const result = GridEventSchema.parse(event);

  return result;
};
