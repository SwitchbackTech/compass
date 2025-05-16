import { error } from "@backend/common/errors/handlers/error.handler";
import { SyncError } from "@backend/common/errors/sync/sync.errors";
import { getSync } from "@backend/sync/util/sync.queries";

/**
 * Get the user ID and Google Calendar ID from a sync payload
 */
export const getIdsFromSyncPayload = async (
  channelId: string,
  resourceId: string,
) => {
  // Get the sync record to find the calendar ID
  const sync = await getSync({ resourceId });
  if (!sync) {
    throw error(
      SyncError.NoSyncRecordForUser,
      `Notification not handled because no sync record found for resource ${resourceId}`,
    );
  }
  const userId = sync.user;

  // Find the calendar sync record
  const calendarSync = sync.google?.events?.find(
    (event) => event.channelId === channelId,
  );
  if (!calendarSync?.gCalendarId) {
    throw error(
      SyncError.NoSyncRecordForUser,
      `Notification not handled because no calendar found for channel ${channelId}`,
    );
  }

  return {
    userId,
    gCalendarId: calendarSync.gCalendarId,
  };
};
