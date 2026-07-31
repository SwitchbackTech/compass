import { CalendarIdSchema, EventIdSchema } from "@core/types/domain-primitives";
import { type ServerMessage } from "@core/types/server-message.contracts";
import { type SyncInvalidation } from "@core/types/sync/change-feed.contracts";

// A connection-level invalidation (auth state, calendar membership) has no
// single owning calendar to report, but eventsChanged's contract requires
// one. The browser's SSE handler ignores calendarId/eventIds entirely — it
// just triggers a broad day/week refetch — so this exists only to satisfy the
// schema, the same acknowledgment-filler role UNKNOWN_CALENDAR_ID plays in
// event-command.translation.ts's synthesized replace response.
export const UNKNOWN_CALENDAR_ID = CalendarIdSchema.parse(
  "000000000000000000000000",
);

// Translate a content-free Sync invalidation into zero or more browser SSE
// messages. The browser treats these as refetch signals; payloads stay id-only.
export function syncInvalidationToServerMessages(
  invalidation: SyncInvalidation,
): ServerMessage[] {
  switch (invalidation.kind) {
    case "event":
      return [
        {
          type: "eventsChanged",
          calendarId: CalendarIdSchema.parse(invalidation.calendarId),
          eventIds: [EventIdSchema.parse(invalidation.eventId)],
          reason: "reconciled",
        },
      ];
    case "calendar": {
      // Provider pull/repair changed this calendar's events. Emit both so the
      // SPA refetches the calendar list and the event queries (useEventSSE only
      // invalidates events on eventsChanged).
      const calendarId = CalendarIdSchema.parse(invalidation.calendarId);
      return [
        {
          type: "calendarsChanged",
          calendarIds: [calendarId],
        },
        {
          type: "eventsChanged",
          calendarId,
          eventIds: [],
          reason: "reconciled",
        },
      ];
    }
    case "connection":
      // Connection state / calendar membership may have changed. A calendar
      // becoming read-only, disconnected, or newly visible changes which
      // events the browser should show — invalidate events too, not just the
      // calendar list, or a connection change that affects event visibility
      // silently fails to refetch them.
      return [
        { type: "calendarsChanged", calendarIds: [] },
        {
          type: "eventsChanged",
          calendarId: UNKNOWN_CALENDAR_ID,
          eventIds: [],
          reason: "reconciled",
        },
      ];
    case "importProgress":
      if (invalidation.progress.complete) {
        return [
          { type: "syncStatusChanged", sync: { status: "healthy" } },
          {
            type: "importCompleted",
            operation: "full",
            eventsCount: 0,
            calendarsCount: invalidation.progress.calendarsCompleted,
          },
        ];
      }
      return [{ type: "syncStatusChanged", sync: { status: "syncing" } }];
    case "command":
      // Paired with an `event` invalidation on the write path; nothing extra
      // for the browser.
      return [];
  }
}
