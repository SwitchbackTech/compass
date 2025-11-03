import { ClientSession } from "mongodb";
import {
  EVENT_CHANGED,
  SOMEDAY_EVENT_CHANGED,
} from "@core/constants/websocket.constants";
import { Logger } from "@core/logger/winston.logger";
import {
  EventUpdate,
  TransitionCategoriesRecurrence,
} from "@core/types/event.types";
import { Event_Transition } from "@core/types/sync.types";
import { GenericError } from "@backend/common/errors/generic/generic.errors";
import { error } from "@backend/common/errors/handlers/error.handler";
import mongoService from "@backend/common/services/mongo.service";
import { CompassEventFactory } from "@backend/event/classes/compass.event.generator";
import { CompassEventParser } from "@backend/event/classes/compass.event.parser";
import { webSocketServer } from "@backend/servers/websocket/websocket.server";

const logger = Logger("app.compass.sync.processor");

export class CompassSyncProcessor {
  static async processEvents(
    events: EventUpdate[],
    _session?: ClientSession,
  ): Promise<Event_Transition[]> {
    // why session.withTransaction
    // see: https://github.com/Automattic/mongoose/issues/7502
    logger.debug(`Processing ${events.length} event(s)...`);

    const session =
      _session ??
      (await mongoService.startSession({ causalConsistency: true }));

    const summaries: Event_Transition[] = await (_session
      ? CompassSyncProcessor.#processEvents(events, session)
      : session.withTransaction(async () =>
          CompassSyncProcessor.#processEvents(events, session),
        ));

    return summaries;
  }

  static async #processEvents(
    events: EventUpdate[],
    session?: ClientSession,
  ): Promise<Event_Transition[]> {
    const summaries: Event_Transition[] = [];

    logger.debug(`Processing ${events.length} event(s)...`);

    try {
      const compassEvents = await Promise.all(
        events.map(async (event) =>
          CompassEventFactory.generateEvents(event, session),
        ),
      ).then((events) => events.flat());

      if (!events.some((e) => e.providerSync)) {
        console.log("LATEST CHANGES (from Compass):");
        console.log(JSON.stringify(compassEvents, null, 2));
      }

      for (const event of compassEvents) {
        const changes = await CompassSyncProcessor.handleCompassChange(
          event,
          session,
        );

        summaries.push(...changes);
      }
    } finally {
      CompassSyncProcessor.notifyClients(summaries);
    }

    return summaries;
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

  private static notifyClients(summaries: Event_Transition[]): void {
    const notices = summaries.flatMap((summary) => {
      const userId = summary.user.toString();
      const notification = CompassSyncProcessor.getNotificationType(summary);

      return notification.map((note) => `${userId}:${note}`);
    });

    const uniqueNotices = Array.from(new Set(notices));

    uniqueNotices.forEach((notice) => {
      const [userId, notification] = notice.split(":");

      switch (notification) {
        case EVENT_CHANGED:
          webSocketServer.handleBackgroundCalendarChange(userId!);
          break;
        case SOMEDAY_EVENT_CHANGED:
          webSocketServer.handleBackgroundSomedayChange(userId!);
          break;
        default:
          logger.error(
            `Unknown notification type: ${notification} for user: ${userId}`,
          );
      }
    });
  }

  private static async handleCompassChange(
    event: EventUpdate,
    session?: ClientSession,
  ): Promise<Event_Transition[]> {
    const eventId = event.payload._id;
    const parser = new CompassEventParser(event);

    await parser.init(session);

    const transition = parser.getTransitionString();

    logger.info(`Handle Compass event(${eventId}): ${transition}`);

    switch (transition) {
      case `NIL->>${TransitionCategoriesRecurrence.REGULAR_SOMEDAY_CONFIRMED}`:
      case `NIL->>${TransitionCategoriesRecurrence.RECURRENCE_BASE_SOMEDAY_CONFIRMED}`:
      case `NIL->>${TransitionCategoriesRecurrence.REGULAR_CONFIRMED}`:
      case `NIL->>${TransitionCategoriesRecurrence.RECURRENCE_BASE_CONFIRMED}`:
      case `REGULAR_SOMEDAY->>${TransitionCategoriesRecurrence.REGULAR_CONFIRMED}`:
      case `RECURRENCE_BASE_SOMEDAY->>${TransitionCategoriesRecurrence.RECURRENCE_BASE_CONFIRMED}`:
      case `RECURRENCE_INSTANCE_SOMEDAY->>${TransitionCategoriesRecurrence.REGULAR_CONFIRMED}`:
        return parser.createEvent(session);
      case `REGULAR_SOMEDAY->>${TransitionCategoriesRecurrence.REGULAR_SOMEDAY_CONFIRMED}`:
      case `REGULAR->>${TransitionCategoriesRecurrence.REGULAR_CONFIRMED}`:
      case `RECURRENCE_INSTANCE_SOMEDAY->>${TransitionCategoriesRecurrence.RECURRENCE_INSTANCE_SOMEDAY_CONFIRMED}`:
      case `RECURRENCE_INSTANCE->>${TransitionCategoriesRecurrence.RECURRENCE_INSTANCE_CONFIRMED}`:
        return parser.updateEvent(session);
      case `NIL->>${TransitionCategoriesRecurrence.REGULAR_SOMEDAY_CANCELLED}`:
      case `NIL->>${TransitionCategoriesRecurrence.REGULAR_CANCELLED}`:
      case `NIL->>${TransitionCategoriesRecurrence.RECURRENCE_INSTANCE_CANCELLED}`:
      case `NIL->>${TransitionCategoriesRecurrence.RECURRENCE_INSTANCE_SOMEDAY_CANCELLED}`:
      case `REGULAR_SOMEDAY->>${TransitionCategoriesRecurrence.REGULAR_SOMEDAY_CANCELLED}`:
      case `REGULAR->>${TransitionCategoriesRecurrence.REGULAR_CANCELLED}`:
      case `RECURRENCE_INSTANCE->>${TransitionCategoriesRecurrence.RECURRENCE_INSTANCE_CANCELLED}`:
      case `RECURRENCE_INSTANCE_SOMEDAY->>${TransitionCategoriesRecurrence.RECURRENCE_INSTANCE_SOMEDAY_CANCELLED}`:
        return parser.deleteEvent(session);
      case `REGULAR->>${TransitionCategoriesRecurrence.REGULAR_SOMEDAY_CONFIRMED}`:
        return parser.regularToSomeday(session);
      case `RECURRENCE_BASE->>${TransitionCategoriesRecurrence.RECURRENCE_BASE_SOMEDAY_CONFIRMED}`:
        return parser.seriesToSomedaySeries(session);
      case `RECURRENCE_BASE_SOMEDAY->>${TransitionCategoriesRecurrence.REGULAR_SOMEDAY_CONFIRMED}`:
      case `RECURRENCE_BASE->>${TransitionCategoriesRecurrence.REGULAR_CONFIRMED}`:
        return parser.seriesToRegular(session);
      case `REGULAR_SOMEDAY->>${TransitionCategoriesRecurrence.RECURRENCE_BASE_SOMEDAY_CONFIRMED}`:
      case `REGULAR->>${TransitionCategoriesRecurrence.RECURRENCE_BASE_CONFIRMED}`:
        return parser.regularToSeries(session);
      case `RECURRENCE_BASE->>${TransitionCategoriesRecurrence.RECURRENCE_BASE_CONFIRMED}`:
      case `RECURRENCE_BASE_SOMEDAY->>${TransitionCategoriesRecurrence.RECURRENCE_BASE_SOMEDAY_CONFIRMED}`:
        return parser.updateSeries(session);
      case `NIL->>${TransitionCategoriesRecurrence.RECURRENCE_BASE_SOMEDAY_CANCELLED}`:
      case `NIL->>${TransitionCategoriesRecurrence.RECURRENCE_BASE_CANCELLED}`:
      case `RECURRENCE_BASE_SOMEDAY->>${TransitionCategoriesRecurrence.RECURRENCE_BASE_SOMEDAY_CANCELLED}`:
      case `RECURRENCE_BASE->>${TransitionCategoriesRecurrence.RECURRENCE_BASE_CANCELLED}`:
        return parser.cancelSeries(session);
      default:
        throw error(
          GenericError.DeveloperError,
          `Compass event handler failed: ${transition}`,
        );
    }
  }
}
