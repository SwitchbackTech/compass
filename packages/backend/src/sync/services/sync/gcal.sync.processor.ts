import { ClientSession } from "mongodb";
import { Logger } from "@core/logger/winston.logger";
import { Schema_Calendar } from "@core/types/calendar.types";
import {
  EventUpdate,
  RecurringEventUpdateScope,
} from "@core/types/event.types";
import { gSchema$Event } from "@core/types/gcal";
import { Event_Transition } from "@core/types/sync.types";
import { StringV4Schema } from "@core/types/type.utils";
import mongoService from "@backend/common/services/mongo.service";
import { GcalEventParser } from "@backend/event/classes/gcal.event.parser";
import { CompassSyncProcessor } from "./compass.sync.processor";

const logger = Logger("app.gcal.events.sync.processor");

export class GcalEventsSyncProcessor {
  static async processEvents(
    events: Array<{ calendar: Schema_Calendar; payload: gSchema$Event }>,
  ): Promise<Event_Transition[]> {
    logger.debug(`Processing ${events.length} event(s)...`);

    const session = await mongoService.startSession({
      causalConsistency: true,
    });

    const summary = await session.withTransaction(async () => {
      const compassEvents = await Promise.all(
        events.map((event) =>
          GcalEventsSyncProcessor.gcalToCompassEventUpdate(event, session),
        ),
      );

      const changes = await CompassSyncProcessor.processEvents(
        compassEvents,
        session,
      );

      return changes;
    });

    return summary;
  }

  private static async gcalToCompassEventUpdate(
    {
      calendar,
      payload,
    }: { calendar: Schema_Calendar; payload: gSchema$Event },
    session?: ClientSession,
  ): Promise<EventUpdate> {
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

    return {
      applyTo: RecurringEventUpdateScope.THIS_EVENT,
      providerSync: false,
      calendar,
      status: parser.status,
      payload: parser.event,
    };
  }
}
