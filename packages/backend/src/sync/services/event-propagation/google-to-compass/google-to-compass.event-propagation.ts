import { Logger } from "@core/logger/winston.logger";
import { type gCalendar, type gSchema$Event } from "@core/types/gcal";
import { type CalendarRecord } from "@backend/calendar/calendar.record";
import mongoService from "@backend/common/services/mongo.service";
import {
  GoogleEventSync,
  type GoogleEventSyncResult,
} from "@backend/event/google-event-sync.service";

const logger = Logger("app:google-to-compass.event-propagation");

/**
 * Applies a batch of incoming Google Calendar webhook/notification changes
 * onto the owning CalendarRecord's events (B8), inside a single transaction
 * (a webhook import can lose a write conflict against a concurrent user
 * save, so the caller retries transient conflicts).
 */
export class GoogleToCompassEventPropagation {
  constructor(
    private gcal: gCalendar,
    private calendar: CalendarRecord,
  ) {}

  async processEvents(events: gSchema$Event[]): Promise<GoogleEventSyncResult> {
    logger.debug(
      `Processing ${events.length} event(s) for calendar ${this.calendar._id.toHexString()}...`,
    );

    const session = await mongoService.startSession({
      causalConsistency: true,
    });

    try {
      // withTransaction retries on TransientTransactionError: a webhook
      // import can lose a write conflict against a concurrent user save (or
      // a second webhook fired by rapid saves), and without the retry that
      // transient conflict surfaced as a 500.
      return await session.withTransaction(async (session) => {
        const sync = new GoogleEventSync(this.gcal, this.calendar);
        return sync.apply(events, 1000, session);
      });
    } finally {
      await session.endSession();
    }
  }
}
