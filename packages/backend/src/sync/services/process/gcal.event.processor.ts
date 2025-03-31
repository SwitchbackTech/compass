import { Origin } from "@core/constants/core.constants";
import { Logger } from "@core/logger/winston.logger";
import { MapEvent } from "@core/mappers/map.event";
import { gCalendar, gSchema$Event } from "@core/types/gcal";
import { Collections } from "@backend/common/constants/collections";
import mongoService from "@backend/common/services/mongo.service";
import {
  findCompassEventBy,
  updateEvent,
} from "@backend/event/queries/event.queries";
import eventService from "@backend/event/services/event.service";
import { GCalRecurringEventAdapter } from "@backend/event/services/recur/adapters/gcal.recur.adapter";

const logger = Logger("app:sync.gcal.event.processor");

/**
 * Processes Google Calendar events, handling both regular and recurring events appropriately
 */
export class GCalEventProcessor {
  private recurringAdapter: GCalRecurringEventAdapter;

  constructor(
    gcal: gCalendar,
    private userId: string,
  ) {
    this.recurringAdapter = new GCalRecurringEventAdapter(userId, gcal);
  }

  /**
   * Process a batch of Google Calendar events
   */
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
   * Process recurring events using the recurring event adapter
   * This will determine the appropriate action and handle it accordingly
   */
  private async processRecurringEvents(recurringEvents: gSchema$Event[]) {
    if (recurringEvents.length > 0) {
      console.log("++ processing recurring events", recurringEvents);
      await this.recurringAdapter.processEvents(recurringEvents);
    }
  }
}
