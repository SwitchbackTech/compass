import { ClientSession } from "mongodb";
import {
  EVENT_CHANGED,
  SOMEDAY_EVENT_CHANGED,
} from "@core/constants/websocket.constants";
import { Logger } from "@core/logger/winston.logger";
import { CompassEvent } from "@core/types/event.types";
import { GenericError } from "@backend/common/errors/generic/generic.errors";
import { error } from "@backend/common/errors/handlers/error.handler";
import mongoService from "@backend/common/services/mongo.service";
import { CompassEventFactory } from "@backend/event/classes/compass.event.generator";
import { CompassEventParser } from "@backend/event/classes/compass.event.parser";
import { webSocketServer } from "@backend/servers/websocket/websocket.server";
import { Event_Transition } from "@backend/sync/sync.types";

const logger = Logger("app.compass.sync.processor");

export class CompassSyncProcessor {
  static async processEvents(
    events: CompassEvent[],
    _session?: ClientSession,
  ): Promise<Event_Transition[]> {
    const summary: Event_Transition[] = [];

    logger.debug(`Processing ${events.length} event(s)...`);

    const session = _session ?? (await mongoService.startSession());

    if (!_session) session.startTransaction();

    try {
      const compassEvents = await Promise.all(
        events.map(async (event) =>
          CompassEventFactory.generateEvents(event, session),
        ),
      ).then((events) => events.flat());

      console.log("LATEST CHANGES (from Compass):");
      console.log(JSON.stringify(compassEvents, null, 2));

      for (const event of compassEvents) {
        const changes = await CompassSyncProcessor.handleCompassChange(
          event,
          session,
        );

        summary.push(...changes);
      }

      if (!_session) await session.commitTransaction();
    } catch (error) {
      if (!_session) await session.abortTransaction();

      throw error;
    }

    if (!_session) CompassSyncProcessor.notifyClients(events, summary);

    return summary;
  }

  private static getNotificationType({
    transition: [from, to],
  }: Event_Transition): Array<
    typeof EVENT_CHANGED | typeof SOMEDAY_EVENT_CHANGED
  > {
    const notifications: Array<
      typeof EVENT_CHANGED | typeof SOMEDAY_EVENT_CHANGED
    > = [];

    if (from) {
      const isSomeday = from.includes("SOMEDAY");

      notifications.push(isSomeday ? SOMEDAY_EVENT_CHANGED : EVENT_CHANGED);
    }

    const isSomeday = to.includes("SOMEDAY");

    notifications.push(isSomeday ? SOMEDAY_EVENT_CHANGED : EVENT_CHANGED);

    return notifications;
  }

  private static notifyClients(
    events: CompassEvent[],
    summary: Event_Transition[],
  ): void {
    const notifications = [
      ...new Set(summary.flatMap(CompassSyncProcessor.getNotificationType)),
    ];

    const uniqueUserIds = new Set(events.map((e) => e.payload.user));

    uniqueUserIds.forEach((userId) => {
      notifications.forEach((notification) => {
        switch (notification) {
          case EVENT_CHANGED:
            webSocketServer.handleBackgroundCalendarChange(userId);
            break;
          case SOMEDAY_EVENT_CHANGED:
            webSocketServer.handleBackgroundSomedayChange(userId);
            break;
          default:
            logger.error(
              `Unknown notification type: ${notification} for user: ${userId}`,
            );
        }
      });
    });
  }

  private static async handleCompassChange(
    event: CompassEvent,
    session?: ClientSession,
  ): Promise<Event_Transition[]> {
    const eventId = event.payload._id;
    const parser = new CompassEventParser(event);

    await parser.init(session);

    const transition = parser.getTransitionString();

    logger.info(`Handle Compass event(${eventId}): ${transition}`);

    switch (transition) {
      case "NIL->>STANDALONE_SOMEDAY_CONFIRMED":
      case "NIL->>RECURRENCE_BASE_SOMEDAY_CONFIRMED":
      case "NIL->>STANDALONE_CONFIRMED":
      case "NIL->>RECURRENCE_BASE_CONFIRMED":
      case "STANDALONE_SOMEDAY->>STANDALONE_CONFIRMED":
      case "RECURRENCE_BASE_SOMEDAY->>RECURRENCE_BASE_CONFIRMED":
      case "RECURRENCE_INSTANCE_SOMEDAY->>STANDALONE_CONFIRMED":
        return parser.createEvent(session);
      case "STANDALONE_SOMEDAY->>STANDALONE_SOMEDAY_CONFIRMED":
      case "STANDALONE->>STANDALONE_CONFIRMED":
      case "RECURRENCE_INSTANCE_SOMEDAY->>RECURRENCE_INSTANCE_SOMEDAY_CONFIRMED":
      case "RECURRENCE_INSTANCE->>RECURRENCE_INSTANCE_CONFIRMED":
        return parser.updateEvent(session);
      case "NIL->>STANDALONE_SOMEDAY_CANCELLED":
      case "NIL->>STANDALONE_CANCELLED":
      case "NIL->>RECURRENCE_INSTANCE_CANCELLED":
      case "NIL->>RECURRENCE_INSTANCE_SOMEDAY_CANCELLED":
      case "STANDALONE_SOMEDAY->>STANDALONE_SOMEDAY_CANCELLED":
      case "STANDALONE->>STANDALONE_CANCELLED":
      case "RECURRENCE_INSTANCE->>RECURRENCE_INSTANCE_CANCELLED":
      case "RECURRENCE_INSTANCE_SOMEDAY->>RECURRENCE_INSTANCE_SOMEDAY_CANCELLED":
        return parser.deleteEvent(session);
      case "STANDALONE->>STANDALONE_SOMEDAY_CONFIRMED":
        return parser.standaloneToSomeday(session);
      case "RECURRENCE_BASE->>RECURRENCE_BASE_SOMEDAY_CONFIRMED":
        return parser.seriesToSomedaySeries(session);
      case "RECURRENCE_BASE_SOMEDAY->>STANDALONE_SOMEDAY_CONFIRMED":
      case "RECURRENCE_BASE->>STANDALONE_CONFIRMED":
        return parser.seriesToStandalone(session);
      case "STANDALONE_SOMEDAY->>RECURRENCE_BASE_SOMEDAY_CONFIRMED":
      case "STANDALONE->>RECURRENCE_BASE_CONFIRMED":
        return parser.standaloneToSeries(session);
      case "RECURRENCE_BASE->>RECURRENCE_BASE_CONFIRMED":
      case "RECURRENCE_BASE_SOMEDAY->>RECURRENCE_BASE_SOMEDAY_CONFIRMED":
        return parser.updateSeries(session);
      case "NIL->>RECURRENCE_BASE_SOMEDAY_CANCELLED":
      case "NIL->>RECURRENCE_BASE_CANCELLED":
      case "RECURRENCE_BASE_SOMEDAY->>RECURRENCE_BASE_SOMEDAY_CANCELLED":
      case "RECURRENCE_BASE->>RECURRENCE_BASE_CANCELLED":
        return parser.cancelSeries(session);
      default:
        throw error(
          GenericError.DeveloperError,
          `Compass event handler failed: ${transition}`,
        );
    }
  }
}
