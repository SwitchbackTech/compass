import { type Event, EventSchema } from "@core/types/event.contracts";
import { type SyncEventInstance } from "@core/types/sync/event.contracts";
import { composeOccurrenceId } from "./occurrence-id";

// Translate one sync full-fidelity instance into the browser Event contract.
// D1=II: singles and series-master rows keep the real eventId; projected
// occurrences get a composed id the write path can reverse. content.kind is
// always "details" (sync always carries title+description). calendarId passes
// through as the sync calendar id (S39 option 2 — no legacy bridge).
export const syncEventInstanceToBrowser = (
  instance: SyncEventInstance,
): Event => {
  switch (instance.recurrence.kind) {
    case "single":
      return EventSchema.parse({
        id: instance.eventId,
        calendarId: instance.calendarId,
        content: {
          kind: "details",
          title: instance.content.title,
          description: instance.content.description,
        },
        schedule: instance.schedule,
        recurrence: { kind: "single" },
        createdAt: instance.createdAt,
        updatedAt: instance.updatedAt,
      });
    case "series":
      return EventSchema.parse({
        id: instance.eventId,
        calendarId: instance.calendarId,
        content: {
          kind: "details",
          title: instance.content.title,
          description: instance.content.description,
        },
        schedule: instance.schedule,
        recurrence: { kind: "series", rules: instance.recurrence.rules },
        createdAt: instance.createdAt,
        updatedAt: instance.updatedAt,
      });
    case "occurrence":
      return EventSchema.parse({
        id: composeOccurrenceId({
          eventId: instance.eventId,
          recurrenceId: instance.recurrence.recurrenceId,
        }),
        calendarId: instance.calendarId,
        content: {
          kind: "details",
          title: instance.content.title,
          description: instance.content.description,
        },
        schedule: instance.schedule,
        recurrence: { kind: "occurrence", seriesId: instance.eventId },
        createdAt: instance.createdAt,
        updatedAt: instance.updatedAt,
      });
  }
};
