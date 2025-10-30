import { ClientSession } from "mongodb";
import { Logger } from "@core/logger/winston.logger";
import { Schema_Calendar } from "@core/types/calendar.types";
import { RecurringEventUpdateScope } from "@core/types/event.types";
import { gSchema$Event } from "@core/types/gcal";
import { StringV4Schema } from "@core/types/type.utils";
import mongoService from "@backend/common/services/mongo.service";
import { GcalEventParser } from "@backend/event/classes/gcal.event.parser";
import { CompassSyncProcessor } from "@backend/sync/services/sync/compass.sync.processor";
import { Event_Transition } from "@backend/sync/sync.types";

const logger = Logger("app.gcal.events.sync.processor");

export class GcalEventsSyncProcessor {
  static async processEvents(
    events: Array<{ calendar: Schema_Calendar; payload: gSchema$Event }>,
  ): Promise<Event_Transition[]> {
    const summary: Event_Transition[] = [];

    logger.debug(`Processing ${events.length} event(s)...`);

    const session = await mongoService.startSession({
      causalConsistency: true,
    });

    session.startTransaction();

    try {
      for (const event of events) {
        const changes = await GcalEventsSyncProcessor.handleGCalChange(
          event,
          session,
        );

        summary.push(...changes);
      }

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();

      throw error;
    }

    return summary;
  }

  private static async handleGCalChange(
    {
      calendar,
      payload,
    }: { calendar: Schema_Calendar; payload: gSchema$Event },
    session?: ClientSession,
  ): Promise<Event_Transition[]> {
    const id = StringV4Schema.parse(payload.id, {
      error: () => "Event not processed due to missing id",
    });

    const parser = new GcalEventParser({
      calendar,
      payload: { ...payload, id },
    });

    await parser.init(session);

    const transition = `Gcal event(${id}): ${parser.getTransitionString()}`;

    logger.info(`Handle ${transition}`);

    return CompassSyncProcessor.processEvents(
      [
        {
          applyTo: RecurringEventUpdateScope.THIS_EVENT,
          providerSync: false,
          calendar,
          status: parser.status,
          payload: parser.event,
        },
      ],
      session,
    );
  }
}
