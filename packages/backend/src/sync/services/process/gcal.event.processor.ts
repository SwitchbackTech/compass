import { Origin } from "@core/constants/core.constants";
import { MapEvent } from "@core/mappers/map.event";
import { gCalendar, gSchema$Event } from "@core/types/gcal";
import { SyncError } from "@backend/common/constants/error.constants";
import { error } from "@backend/common/errors/handlers/error.handler";
import eventService from "@backend/event/services/event.service";
import { GCalRecurringEventAdapter } from "@backend/event/services/recur/adapters/gcal.recur.adapter";

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
    const { regular, recurring } = this.categorizeEvents(events);

    // 2. Process each category
    await Promise.all([
      this.processRegularEvents(regular),
      this.processRecurringEvents(recurring),
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
    if (events.length === 0) {
      throw error(SyncError.NoEventChanges, "No regular events to process");
    }

    const compassEvents = MapEvent.toCompass(
      this.userId,
      events,
      Origin.GOOGLE_IMPORT,
    );
    await eventService.createMany(compassEvents);
  }

  /**
   * Process recurring events using the recurring event adapter
   * This will determine the appropriate action and handle it accordingly
   */
  private async processRecurringEvents(events: gSchema$Event[]) {
    if (events.length === 0) {
      throw error(SyncError.NoEventChanges, "No recurring events to process");
    }

    await this.recurringAdapter.processEvents(events);
  }
}
