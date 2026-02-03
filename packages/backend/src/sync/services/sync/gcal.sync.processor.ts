import { ClientSession } from "mongodb";
import { Logger } from "@core/logger/winston.logger";
import { WithGcalId, gSchema$Event } from "@core/types/gcal";
import { EventError } from "@backend/common/errors/event/event.errors";
import { GenericError } from "@backend/common/errors/generic/generic.errors";
import { error } from "@backend/common/errors/handlers/error.handler";
import mongoService from "@backend/common/services/mongo.service";
import { GcalEventParser } from "@backend/event/classes/gcal.event.parser";
import { Event_Transition } from "@backend/sync/sync.types";

const logger = Logger("app.gcal.sync.processor");
export class GcalSyncProcessor {
  constructor(private userId: string) {}

  async processEvents(events: gSchema$Event[]): Promise<Event_Transition[]> {
    const summary: Event_Transition[] = [];

    logger.debug(`Processing ${events.length} event(s)...`);

    const session = await mongoService.startSession({
      causalConsistency: true,
    });

    session.startTransaction();

    try {
      for (const event of events) {
        const changes = await this.handleGCalChange(event, session);

        summary.push(...changes);
      }

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();

      throw error;
    }

    return summary;
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
