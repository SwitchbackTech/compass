import { CalendarIdSchema, EventIdSchema } from "@core/types/domain-primitives";
import { type ServerMessage } from "@core/types/server-message.contracts";
import { type SyncInvalidation } from "@core/types/sync/change-feed.contracts";

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
    case "calendar":
      return [
        {
          type: "calendarsChanged",
          calendarIds: [CalendarIdSchema.parse(invalidation.calendarId)],
        },
      ];
    case "connection":
      // Connection state / calendar membership may have changed; the web
      // invalidates the whole calendar list on this signal.
      return [{ type: "calendarsChanged", calendarIds: [] }];
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
