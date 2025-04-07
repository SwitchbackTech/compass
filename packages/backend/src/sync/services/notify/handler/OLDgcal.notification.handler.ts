import { Origin } from "@core/constants/core.constants";
import { Logger } from "@core/logger/winston.logger";
import { MapEvent } from "@core/mappers/map.event";
import { gCalendar, gSchema$Event } from "@core/types/gcal";
import { Collections } from "@backend/common/constants/collections";
import { SyncError } from "@backend/common/constants/error.constants";
import { error } from "@backend/common/errors/handlers/error.handler";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";
import { updateEvent } from "@backend/event/queries/event.queries";
import { findCompassEventBy } from "@backend/event/queries/event.queries";
import eventService from "@backend/event/services/event.service";
import { getSync, updateSyncTokenFor } from "@backend/sync/util/sync.queries";

const logger = Logger("app:gcal.notification.handler");

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
  }): Promise<string> {
    const nextSyncToken = await this.getNextSyncTokenForCalendar(payload);
    const { hasChanges, changes } = await this.getLatestChanges(
      payload.calendarId,
      nextSyncToken,
    );

    if (hasChanges) {
      console.log("++ processing changes:", changes.length);
      await this.processEvents(changes);
      return "CHANGES_PROCESSED";
    } else {
      return "NO_CHANGES";
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

    console.log("++ response after getting latest changes:");
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
  async processEvents(events: gSchema$Event[]): Promise<void> {
    // 1. Categorize events by type
    const categorizedEvents = this.categorizeEvents(events);
    logger.debug("Categorized events to process:");
    logger.debug(JSON.stringify(categorizedEvents, null, 2));

    // 2. Process each category
    await Promise.all([
      this.processRegularEvents(categorizedEvents.regular),
      this.processRecurringEvents(categorizedEvents.recurring),
    ]);
  }

  /**
   * Categorize events into regular and recurring
   */
  private categorizeEvents(events: gSchema$Event[]): {
    regular: gSchema$Event[];
    recurring: gSchema$Event[];
  } {
    return events.reduce(
      (
        acc: { regular: gSchema$Event[]; recurring: gSchema$Event[] },
        event,
      ) => {
        if (event.recurrence || event.recurringEventId) {
          acc.recurring.push(event);
        } else {
          acc.regular.push(event);
        }
        return acc;
      },
      { regular: [], recurring: [] },
    );
  }

  /**
   * Process regular (non-recurring) events
   */
  private async processRegularEvents(events: gSchema$Event[]): Promise<void> {
    if (events.length > 0) {
      console.log("++ processing regular events", events);
      const compassEvents = MapEvent.toCompass(
        this.userId,
        events,
        Origin.GOOGLE_IMPORT,
      );

      // Process each event individually to handle upserts
      await Promise.all(
        compassEvents.map(async (event) => {
          // Try to find existing event by gEventId
          if (!event.gEventId) {
            // If no gEventId, create new event
            await eventService.create(this.userId, event);
            return;
          }

          const { eventExists, event: existingEvent } =
            await findCompassEventBy("gEventId", event.gEventId);
          if (eventExists) {
            // Update existing event
            await updateEvent(this.userId, existingEvent._id as string, event);
          } else {
            const _event = {
              ...event,
              _id: undefined,
              updatedAt: new Date(),
              user: this.userId,
            };
            console.log("++ creating new event", _event);
            // Create new event
            await mongoService.db
              .collection(Collections.EVENT)
              .insertOne(_event);
          }
        }),
      );
    }
  }

  /**
   * Process recurring events from Gcal -> Compass
   */
  private async processRecurringEvents(recurringEvents: gSchema$Event[]) {
    console.log(`Processing recurring events: ${recurringEvents.length}`);
    return "TODO";
  }
}
