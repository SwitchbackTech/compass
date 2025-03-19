import { gCalendar } from "@core/types/gcal";
import { Schema_Sync } from "@core/types/sync.types";
import syncService from "../sync.service";

export const assembleEventWatchPayloads = (
  sync: Schema_Sync,
  gCalendarIds: string[],
) => {
  const watchPayloads = gCalendarIds.map((gCalId) => {
    const match = sync?.google.events.find((es) => es.gCalendarId === gCalId);
    const eventNextSyncToken = match?.nextSyncToken;
    if (eventNextSyncToken) {
      return { gCalId, nextSyncToken: eventNextSyncToken };
    }

    return { gCalId };
  });

  return watchPayloads;
};

export const watchEventsByGcalIds = async (
  userId: string,
  gCalendarIds: string[],
  gcal: gCalendar,
) => {
  const watchGcalEvents = gCalendarIds.map((gCalendarId) =>
    syncService.startWatchingGcalEvents(userId, { gCalendarId }, gcal),
  );

  const results = await Promise.all(watchGcalEvents);
  return results;
};
