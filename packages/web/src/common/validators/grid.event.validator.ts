import {
  GridEventSchema,
  type Schema_GridEvent,
  type Schema_WebEvent,
} from "@web/common/types/web.event.types";

function normalizeNullRecurrence(event: Schema_WebEvent): Schema_WebEvent {
  const eventWithNullableRecurrence = event as Schema_WebEvent & {
    recurrence?: Schema_WebEvent["recurrence"] | null;
  };

  if (eventWithNullableRecurrence.recurrence !== null) {
    return event;
  }

  const normalizedEvent = { ...eventWithNullableRecurrence };
  delete (normalizedEvent as { recurrence?: unknown }).recurrence;

  return normalizedEvent as Schema_WebEvent;
}

export const validateGridEvent = (event: Schema_WebEvent): Schema_GridEvent => {
  const result = GridEventSchema.parse(normalizeNullRecurrence(event));

  return result;
};
