import { type gSchema$CalendarListEntry } from "@core/types/gcal";
import { StringV4Schema } from "@core/types/type.utils";
import { error } from "@backend/common/errors/handlers/error.handler";
import { GcalError } from "@backend/common/errors/integration/gcal/gcal.errors";
import { type GoogleRequestContext } from "@backend/common/services/gcal/gcal.context";
import gcalService from "@backend/common/services/gcal/gcal.service";

export const getCalendarsToSync = async (context: GoogleRequestContext) => {
  const items: gSchema$CalendarListEntry[] = [];
  let nextSyncToken: string | null | undefined;

  for await (const {
    items: pageItems = [],
    nextSyncToken: pageSyncToken,
  } of gcalService.getAllCalendarListPages(context)) {
    items.push(...pageItems);
    nextSyncToken = pageSyncToken;
  }

  const parsedSyncToken = StringV4Schema.parse(nextSyncToken, {
    error: () => "Failed to get Calendar(list)s to sync",
  });

  const eligible = items.filter(
    (entry) => entry.deleted !== true && entry.hidden !== true,
  );

  const deduped = new Map<string, gSchema$CalendarListEntry>();

  for (const entry of eligible) {
    if (!entry.id) continue;
    if (!deduped.has(entry.id)) {
      deduped.set(entry.id, entry);
    }
  }

  const calendars = [...deduped.values()];

  const primaryCalendars = calendars.filter(({ primary }) => primary);

  if (primaryCalendars.length > 1) {
    throw error(
      GcalError.MultiplePrimaryCalendars,
      "Google CalendarList returned more than one primary calendar",
    );
  }

  const gCalendarIds = calendars
    .map(({ id }) => id)
    .filter((id): id is string => id !== undefined && id !== null);

  return {
    calendars,
    gCalendarIds,
    nextSyncToken: parsedSyncToken,
    nextPageToken: undefined as string | undefined,
  };
};
