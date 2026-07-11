import { type calendar_v3 } from "@googleapis/calendar";
import { type EventRecord } from "@backend/event/event.record";

export type GoogleCalendarListEntryInput = calendar_v3.Schema$CalendarListEntry;
export type GoogleEventInput = calendar_v3.Schema$Event;

export type GoogleEventMapResult =
  | { kind: "mapped"; event: EventRecord }
  | {
      kind: "cancelled";
      providerEventId: string;
      providerRecurringEventId: string | null;
    }
  | { kind: "ignored"; reason: "unsupportedType" | "outsideRange" }
  | {
      kind: "invalid";
      reason: "missingId" | "missingDates" | "invalidRecurrence";
    };

// events.patch body (A28). Never events.update: update replaces the whole
// resource, clearing attendees, location, reminders, and every other field
// Compass does not model.
export type GoogleEventWriteInput = Pick<
  calendar_v3.Schema$Event,
  "summary" | "description" | "start" | "end" | "recurrence"
>;
