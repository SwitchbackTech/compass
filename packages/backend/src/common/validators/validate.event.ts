import {
  Event_API,
  Schema_Event_API,
} from "@backend/common/types/backend.event.types";
import { safeValidate } from "./validate";

export const validateEventSafely = (event: Event_API) => {
  const result = safeValidate(Schema_Event_API, event);
  return result;
};
