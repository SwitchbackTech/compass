import { Logger } from "@core/logger/winston.logger";
import { gCalendar } from "@core/types/gcal";
import { Resource_Sync } from "@core/types/sync.types";
import gcalService from "@backend/common/services/gcal/gcal.service";
import { GcalSyncProcessor } from "@backend/sync/services/sync/gcal.sync.processor";
import { Summary_Sync } from "@backend/sync/sync.types";
import { updateSync } from "@backend/sync/util/sync.queries";

const logger = Logger("app:gcal.notification.handler");

export class GCalNotificationHandler {
  constructor(
    private gcal: gCalendar,
    private userId: string,
    private calendarId: string,
    private nextSyncToken: string,
  ) {}

  /**
   * Handle a Google Calendar notification
   */
  async handleNotification(): Promise<Summary_Sync> {
    const { hasChanges, changes } = await this.getLatestChanges();

    if (hasChanges) {
      const processor = new GcalSyncProcessor(this.userId);
      const changeSummary = await processor.processEvents(changes);
      console.log("PROCESSED:", changeSummary);
      return { summary: "PROCESSED", changes: changeSummary };
    } else {
      console.log("NO CHANGES TO PROCESS");
      return { summary: "IGNORED", changes: [] };
    }
  }

  /**
   * Get the latest changes from Google Calendar using a sync token
   */
  private async getLatestChanges() {
    const response = await gcalService.getEvents(this.gcal, {
      calendarId: this.calendarId,
      syncToken: this.nextSyncToken,
    });

    const nextSyncToken = response.data.nextSyncToken;

    console.log("LATEST CHANGES (from gcal):");
    console.log(JSON.stringify(response.data, null, 2));

    // If the nextSyncToken matches our current syncToken, we've already processed these changes
    if (nextSyncToken === this.nextSyncToken) {
      logger.info(
        `Skipping notification - changes already processed for calendar ${this.calendarId}`,
      );
      return { hasChanges: false, changes: [] };
    }

    const changes = response.data.items;
    if (!changes || changes.length === 0) {
      logger.info(`No changes found for calendar ${this.calendarId}`);
      return { hasChanges: false, changes: [] };
    }

    // Update the sync token in the database
    if (nextSyncToken) {
      await updateSync(Resource_Sync.EVENTS, this.userId, this.calendarId, {
        nextSyncToken,
      });
    }

    return { hasChanges: true, changes };
  }
}
