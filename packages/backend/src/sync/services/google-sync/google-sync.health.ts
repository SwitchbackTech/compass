import { Resource_Sync } from "@core/types/sync.types";
import dayjs from "@core/util/date/dayjs";
import mongoService from "@backend/common/services/mongo.service";
import { getSync } from "@backend/sync/services/records/sync-records.repository";
import { isUsingGcalWebhookHttps } from "@backend/sync/services/watch/google-watch-config";

export const isGoogleCalendarSyncHealthy = async (
  userId: string,
): Promise<boolean> => {
  const sync = await getSync({ userId });

  if (!sync?.google) {
    return false;
  }

  const eventSyncs = sync.google.events ?? [];
  const calendarListSyncs = sync.google.calendarlist ?? [];

  if (eventSyncs.length === 0 || calendarListSyncs.length === 0) {
    return false;
  }

  if (calendarListSyncs.some(({ nextSyncToken }) => !nextSyncToken)) {
    return false;
  }

  if (eventSyncs.some(({ nextSyncToken }) => !nextSyncToken)) {
    return false;
  }

  if (!isUsingGcalWebhookHttps()) {
    return true;
  }

  const activeWatchCalendarIds = new Set(
    (await mongoService.watch.find({ user: userId }).toArray())
      .filter(({ expiration }) => dayjs(expiration).isAfter(dayjs()))
      .map(({ gCalendarId }) => gCalendarId),
  );

  if (!activeWatchCalendarIds.has(Resource_Sync.CALENDAR)) {
    return false;
  }

  return eventSyncs.every(({ gCalendarId }) =>
    activeWatchCalendarIds.has(gCalendarId),
  );
};

export const googleSyncHealth = {
  isGoogleCalendarSyncHealthy,
};
