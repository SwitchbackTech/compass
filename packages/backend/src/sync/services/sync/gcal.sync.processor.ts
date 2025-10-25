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
  constructor(private calendar: Schema_Calendar) {}

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
    const id = StringV4Schema.parse(gEvent.id, {
      error: () => "Event not processed due to missing id",
    });

    const parser = new GcalEventParser(this.calendar, { ...gEvent, id });

    await parser.init(session);

    const transition = `Gcal event(${id}): ${parser.getTransitionString()}`;

    logger.info(`Handle ${transition}`);

    return CompassSyncProcessor.processEvents(
      [
        {
          applyTo: RecurringEventUpdateScope.THIS_EVENT,
          providerSync: false,
          calendar: this.calendar,
          status: parser.status,
          payload: parser.event,
        },
      ],
      session,
    );
  }
}
