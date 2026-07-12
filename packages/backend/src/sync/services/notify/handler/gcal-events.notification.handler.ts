import { ObjectId } from "mongodb";
import { Logger } from "@core/logger/winston.logger";
import { Resource_Sync } from "@core/types/sync.types";
import { type CalendarRecord } from "@backend/calendar/calendar.record";
import { type GoogleRequestContext } from "@backend/common/services/gcal/gcal.context";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";
import { GoogleToCompassEventPropagation } from "@backend/sync/services/event-propagation/google-to-compass/google-to-compass.event-propagation";
import { updateSync } from "@backend/sync/services/records/sync-records.repository";

const logger = Logger("app:gcal-events.notification.handler");

export type NotificationSummary = {
  summary: "PROCESSED" | "IGNORED";
  calendar: Pick<CalendarRecord, "_id" | "isVisible"> | null;
  eventIds: string[];
};

export class GCalEventsNotificationHandler {
  constructor(
    private context: GoogleRequestContext,
    private userId: string,
    private gCalendarId: string,
    private nextSyncToken: string,
  ) {}

  /**
   * Handle a Google Calendar events notification
   */
  async handleNotification(): Promise<NotificationSummary> {
    const { hasChanges, changes } = await this.getLatestChanges();

    if (!hasChanges) {
      logger.info("NO CHANGES TO PROCESS");
      return { summary: "IGNORED", calendar: null, eventIds: [] };
    }

    const calendar = await mongoService.calendar.findOne({
      userId: new ObjectId(this.userId),
      "source.provider": "google",
      "source.calendarId": this.gCalendarId,
    });

    if (!calendar) {
      logger.warn(
        `Ignoring notification because no owning calendar was found for user ${this.userId}`,
      );
      return { summary: "IGNORED", calendar: null, eventIds: [] };
    }

    const processor = new GoogleToCompassEventPropagation(
      this.context,
      calendar,
    );
    const result = await processor.processEvents(changes);

    logger.info(
      `PROCESSED: saved=${result.saved} deleted=${result.deleted} ignored=${result.ignored} invalid=${result.invalid}`,
    );

    return {
      summary: "PROCESSED",
      calendar: { _id: calendar._id, isVisible: calendar.isVisible },
      eventIds: result.affectedEventIds,
    };
  }

  /**
   * Get the latest changes from Google Calendar using a sync token
   */
  private async getLatestChanges() {
    const response = await gcalService.getEvents(this.context, {
      calendarId: this.gCalendarId,
      syncToken: this.nextSyncToken,
    });

    const nextSyncToken = response.data.nextSyncToken;

    // If the nextSyncToken matches our current syncToken, we've already processed these changes
    if (nextSyncToken === this.nextSyncToken) {
      logger.info(
        `Skipping notification - changes already processed for user: ${this.userId}`,
      );
      return { hasChanges: false, changes: [] };
    }

    const changes = response.data.items;
    if (!changes || changes.length === 0) {
      logger.info(`No changes found for user: ${this.userId}`);
      return { hasChanges: false, changes: [] };
    }

    // Update the sync token in the database
    if (nextSyncToken) {
      await updateSync(Resource_Sync.EVENTS, this.userId, this.gCalendarId, {
        nextSyncToken,
      });
    }

    return { hasChanges: true, changes };
  }
}
