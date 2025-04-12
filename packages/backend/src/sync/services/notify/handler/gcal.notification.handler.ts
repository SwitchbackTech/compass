import { Logger } from "@core/logger/winston.logger";
import { gCalendar } from "@core/types/gcal";
import { SyncError } from "@backend/common/constants/error.constants";
import { error } from "@backend/common/errors/handlers/error.handler";
import gcalService from "@backend/common/services/gcal/gcal.service";
import { RecurringEventRepository } from "@backend/event/queries/event.recur.queries";
import { getSync, updateSyncTokenFor } from "@backend/sync/util/sync.queries";
import { Summary_Sync } from "../../../sync.types";
import { GcalSyncProcessor } from "../../sync/gcal.sync.processor";

const logger = Logger("app:gcal.notification.handler");

export class GCalNotificationHandler {
  private repo: RecurringEventRepository;
  constructor(
    private gcal: gCalendar,
    private userId: string,
  ) {
    this.repo = new RecurringEventRepository(userId);
  }

  /**
   * Handle a Google Calendar notification
   */
  async handleNotification(payload: {
    calendarId: string;
    resourceId: string;
  }): Promise<Summary_Sync> {
    const nextSyncToken = await this.getNextSyncTokenForCalendar(payload);
    const { hasChanges, changes } = await this.getLatestChanges(
      payload.calendarId,
      nextSyncToken,
    );

    if (hasChanges) {
      console.log("\nCHANGES TO PROCESS:", changes.length);
      const processor = new GcalSyncProcessor(this.repo);
      const changeSummary = await processor.processEvents(changes);
      console.log("\nRESULT:", changeSummary);
      return { summary: "PROCESSED", changes: changeSummary };
    } else {
      console.log("\nNO CHANGES TO PROCESS");
      return { summary: "IGNORED", changes: [] };
    }
  }

  /**
   * Get the latest changes from Google Calendar using a sync token
   */
  private async getLatestChanges(calendarId: string, syncToken: string) {
    const response = await gcalService.getEvents(this.gcal, {
      calendarId,
      syncToken,
    });

    console.log("\nLATEST CHANGES:");
    console.log(JSON.stringify(response.data, null, 2));

    // If the nextSyncToken matches our current syncToken, we've already processed these changes
    if (response.data.nextSyncToken === syncToken) {
      logger.info(
        `Skipping notification - changes already processed for calendar ${calendarId}`,
      );
      return { hasChanges: false, changes: [] };
    }

    const changes = response.data.items;
    if (!changes || changes.length === 0) {
      logger.info(`No changes found for calendar ${calendarId}`);
      return { hasChanges: false, changes: [] };
    }

    // Update the sync token in the database
    if (response.data.nextSyncToken) {
      await updateSyncTokenFor(
        "events",
        this.userId,
        response.data.nextSyncToken,
        calendarId,
      );
    }

    return { hasChanges: true, changes };
  }

  private async getNextSyncTokenForCalendar(payload: {
    calendarId: string;
    resourceId: string;
  }) {
    const sync = await getSync({ resourceId: payload.resourceId });
    if (!sync) {
      throw error(
        SyncError.NoSyncRecordForUser,
        `Notification not handled because no sync record found for calendarId: ${payload.calendarId}`,
      );
    }

    // Get the sync token for this calendar
    const calendarSync = sync.google.events.find(
      (event) => event.gCalendarId === payload.calendarId,
    );
    if (!calendarSync?.nextSyncToken) {
      throw error(
        SyncError.NoSyncToken,
        `Notification not handled because no sync token found for calendarId: ${payload.calendarId}`,
      );
    }

    return calendarSync.nextSyncToken;
  }
}
