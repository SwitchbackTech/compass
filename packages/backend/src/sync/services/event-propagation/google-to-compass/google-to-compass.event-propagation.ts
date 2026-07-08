import { type ClientSession } from "mongodb";
import { Logger } from "@core/logger/winston.logger";
import { type gSchema$Event, type WithGcalId } from "@core/types/gcal";
import { EventError } from "@backend/common/errors/event/event.errors";
import { GenericError } from "@backend/common/errors/generic/generic.errors";
import { error } from "@backend/common/errors/handlers/error.handler";
import mongoService from "@backend/common/services/mongo.service";
import { GcalEventParser } from "@backend/event/classes/gcal.event.parser";
import { type Event_Transition } from "@backend/sync/sync.types";

const logger = Logger("app:google-to-compass.event-propagation");
export class GoogleToCompassEventPropagation {
  constructor(private userId: string) {}

  async processEvents(events: gSchema$Event[]): Promise<Event_Transition[]> {
    logger.debug(`Processing ${events.length} event(s)...`);

    const session = await mongoService.startSession({
      causalConsistency: true,
    });

    try {
      // withTransaction retries on TransientTransactionError: a webhook
      // import can lose a write conflict against a concurrent user save (or
      // a second webhook fired by rapid saves), and without the retry that
      // transient conflict surfaced as a 500.
      return await session.withTransaction(async (session) => {
        const summary: Event_Transition[] = [];

        for (const event of events) {
          const changes = await this.handleGCalChange(event, session);

          summary.push(...changes);
        }

        return summary;
      });
    } finally {
      await session.endSession();
    }
  }

  private async handleGCalChange(
    gEvent: gSchema$Event,
    session?: ClientSession,
  ): Promise<Event_Transition[]> {
    if (typeof gEvent.id !== "string") {
      throw error(
        EventError.MissingGevents,
        "Event not processed due to missing id",
      );
    }

    const parser = new GcalEventParser(
      gEvent as WithGcalId<gSchema$Event>,
      this.userId,
    );

    await parser.init(session);

    const transition = `Gcal event(${gEvent.id}): ${parser.getTransitionString()}`;

    logger.info(`Handle ${transition}`);

    switch (parser.getTransitionString()) {
      case "NIL->>STANDALONE_CANCELLED":
      case "NIL->>RECURRENCE_INSTANCE_CANCELLED":
      case "STANDALONE->>STANDALONE_CANCELLED":
      case "RECURRENCE_INSTANCE->>RECURRENCE_INSTANCE_CANCELLED":
        return parser.deleteCompassEvent(session);
      case "NIL->>RECURRENCE_BASE_CANCELLED":
      case "RECURRENCE_BASE->>RECURRENCE_BASE_CANCELLED":
        return parser.cancelSeries(true, session);
      case "NIL->>STANDALONE_CONFIRMED":
      case "NIL->>RECURRENCE_INSTANCE_CONFIRMED":
      case "STANDALONE->>STANDALONE_CONFIRMED":
      case "RECURRENCE_INSTANCE->>RECURRENCE_INSTANCE_CONFIRMED":
        return parser.upsertCompassEvent(undefined, session);
      case "NIL->>RECURRENCE_BASE_CONFIRMED":
        return parser.createSeries(session);
      case "STANDALONE->>RECURRENCE_BASE_CONFIRMED":
        return parser.standaloneToSeries(session);
      case "RECURRENCE_INSTANCE->>STANDALONE_CONFIRMED":
        return parser.instanceToStandalone(session);
      case "RECURRENCE_BASE->>STANDALONE_CONFIRMED":
        return parser.seriesToStandalone(session);
      case "RECURRENCE_INSTANCE->>RECURRENCE_BASE_CONFIRMED":
      case "RECURRENCE_BASE->>RECURRENCE_BASE_CONFIRMED":
        return parser.updateSeries(session);
      default:
        throw error(
          GenericError.DeveloperError,
          `Gcal event handler failed: ${transition}`,
        );
    }
  }
}
