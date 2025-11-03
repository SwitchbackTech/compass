import { ObjectId } from "mongodb";
import { Logger } from "@core/logger/winston.logger";
import {
  CalendarProvider,
  CompassCalendarSchema,
} from "@core/types/calendar.types";
import { gCalendar } from "@core/types/gcal";
import { Resource_Sync, Summary_Sync } from "@core/types/sync.types";
import calendarService from "@backend/calendar/services/calendar.service";
import gcalService from "@backend/common/services/gcal/gcal.service";
import { GcalEventsSyncProcessor } from "@backend/sync/services/sync/gcal.sync.processor";
import { updateSync } from "@backend/sync/util/sync.queries";

const logger = Logger("app:gcal.notification.handler");

export class GCalNotificationHandler {
  constructor(
    private gcal: gCalendar,
    private resource: Resource_Sync,
    private userId: ObjectId,
    private gCalendarId: string,
    private nextSyncToken: string,
  ) {}

  /**
   * Handle a Google Calendar notification
   */
  async handleNotification(): Promise<Summary_Sync> {
    if (this.resource !== Resource_Sync.EVENTS) {
      logger.info(`${this.resource.toUpperCase()} CHANGES - NOT IMPLEMENTED`);
      return { summary: "IGNORED", changes: [] };
    }

    const { hasChanges, changes } = await this.getLatestChanges();

    if (hasChanges) {
      const calendar = await calendarService
        .getByUserAndProvider(
          this.userId,
          this.gCalendarId,
          CalendarProvider.GOOGLE,
        )
        .then((cal) =>
          CompassCalendarSchema.parse(cal, {
            error: () => "Calendar not found",
          }),
        );

      const changeSummary = await GcalEventsSyncProcessor.processEvents(
        changes.map((payload) => ({ calendar, payload })),
      );

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
      calendarId: this.gCalendarId,
      syncToken: this.nextSyncToken,
    });

    const nextSyncToken = response.data.nextSyncToken;

    console.log("LATEST CHANGES (from gcal):");
    console.log(JSON.stringify(response.data, null, 2));

    // If the nextSyncToken matches our current syncToken, we've already processed these changes
    if (nextSyncToken === this.nextSyncToken) {
      logger.info(
        `Skipping notification - changes already processed for calendar ${this.gCalendarId}`,
      );
      return { hasChanges: false, changes: [] };
    }

    const changes = response.data.items;
    if (!changes || changes.length === 0) {
      logger.info(`No changes found for calendar ${this.gCalendarId}`);
      return { hasChanges: false, changes: [] };
    }

    // Update the sync token in the database
    if (nextSyncToken) {
      await updateSync(
        Resource_Sync.EVENTS,
        this.userId.toString(),
        this.gCalendarId,
        { nextSyncToken },
      );
    }

    return { hasChanges: true, changes };
  }
}
