import { gCalendar } from "@core/types/gcal";
import { SyncError } from "@backend/common/constants/error.constants";
import { error } from "@backend/common/errors/handlers/error.handler";
import gcalService from "@backend/common/services/gcal/gcal.service";
import { getSync } from "@backend/sync/util/sync.queries";
import { GCalEventProcessor } from "../process/gcal.event.processor";

export class GCalNotificationHandler {
  constructor(
    private gcal: gCalendar,
    private userId: string,
  ) {}

  /**
   * Handle a Google Calendar notification
   */
  async handleNotification(payload: {
    calendarId: string;
    resourceId: string;
  }): Promise<void> {
    // 1. Get the sync for this calendar
    const sync = await getSync({ resourceId: payload.resourceId });
    if (!sync) {
      throw error(
        SyncError.NoSyncRecordForUser,
        `Notification not handled because no sync record found for calendarId: ${payload.calendarId}`,
      );
    }

    // 2. Get the sync token for this calendar
    const calendarSync = sync.google.events.find(
      (event) => event.gCalendarId === payload.calendarId,
    );
    if (!calendarSync?.nextSyncToken) {
      throw error(
        SyncError.NoSyncToken,
        `Notification not handled because no sync token found for calendarId: ${payload.calendarId}`,
      );
    }

    // 3. Get latest changes using the sync token
    const changes = await this.getLatestChanges(
      payload.calendarId,
      calendarSync.nextSyncToken,
    );

    if (!changes || changes.length === 0) {
      throw error(
        SyncError.NoEventChanges,
        `Notification not handled because no changes found for calendar ${payload.calendarId}`,
      );
    }

    // 4. Process the changes
    const processor = new GCalEventProcessor(this.gcal, this.userId);
    await processor.processEvents(changes);
  }

  /**
   * Get the latest changes from Google Calendar using a sync token
   */
  private async getLatestChanges(calendarId: string, syncToken: string) {
    const response = await gcalService.getEvents(this.gcal, {
      calendarId,
      syncToken,
    });

    return response.data.items;
  }
}
