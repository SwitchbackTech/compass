import {
  type Schema_SomedayEvent,
  type Schema_WebEvent,
  SomedayEventSchema,
} from "../types/web.event.types";

function normalizeNullRecurrence(event: Schema_WebEvent): Schema_WebEvent {
  const eventWithNullableRecurrence = event as Schema_WebEvent & {
    recurrence?: Schema_WebEvent["recurrence"] | null;
  };

  if (eventWithNullableRecurrence.recurrence !== null) {
    return event;
  }

  const { recurrence: _recurrence, ...normalizedEvent } =
    eventWithNullableRecurrence;
  void _recurrence;

  return normalizedEvent as Schema_WebEvent;
}

export const validateSomedayEvent = (
  event: Schema_WebEvent,
): Schema_SomedayEvent => {
  const result = SomedayEventSchema.parse(normalizeNullRecurrence(event));
  return result;
};

export const validateSomedayEvents = (
  events: Schema_WebEvent[],
): Schema_SomedayEvent[] => {
  const results = events.map((event) => validateSomedayEvent(event));
  return results;
};
