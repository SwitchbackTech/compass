import { type ClientSession, ObjectId } from "mongodb";
import {
  EVENT_CHANGED,
  SOMEDAY_EVENT_CHANGED,
} from "@core/constants/websocket.constants";
import { Logger } from "@core/logger/winston.logger";
import {
  type CompassEvent,
  type Schema_Event_Core,
} from "@core/types/event.types";
import { GenericError } from "@backend/common/errors/generic/generic.errors";
import { error } from "@backend/common/errors/handlers/error.handler";
import mongoService from "@backend/common/services/mongo.service";
import { applyCompassPlan } from "@backend/event/classes/compass.event.executor";
import { CompassEventFactory } from "@backend/event/classes/compass.event.generator";
import {
  type CompassOperationPlan,
  analyzeCompassTransition,
} from "@backend/event/classes/compass.event.parser";
import {
  _createGcal,
  _deleteGcal,
  _updateGcal,
} from "@backend/event/services/event.service";
import { webSocketServer } from "@backend/servers/websocket/websocket.server";
import { type Event_Transition } from "@backend/sync/sync.types";

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
    const dbEvent = await mongoService.event.findOne(
      { _id: new ObjectId(eventId), user: event.payload.user! },
      { session },
    );
    const plan = analyzeCompassTransition(event, dbEvent);
    const transition = plan.transitionKey;

    logger.info(`Handle Compass event(${eventId}): ${transition}`);

    const applyResult = await applyCompassPlan(plan, session);

    if (!applyResult.applied) return [];

    const didExecuteGoogleEffect =
      await CompassSyncProcessor.executeGoogleEffect(plan, applyResult);

    return didExecuteGoogleEffect ? [applyResult.summary] : [];
  }

  private static async executeGoogleEffect(
    plan: CompassOperationPlan,
    {
      googleDeleteEventId,
      persistedEvent,
    }: Awaited<ReturnType<typeof applyCompassPlan>>,
  ): Promise<boolean> {
    switch (plan.googleEffect.type) {
      case "none":
        return true;
      case "create":
        if (!persistedEvent) return false;

        await _createGcal(
          persistedEvent.user!,
          persistedEvent as Schema_Event_Core,
        );

        return true;
      case "update":
        if (!persistedEvent) return false;

        await _updateGcal(
          persistedEvent.user!,
          persistedEvent as Schema_Event_Core,
        );

        return true;
      case "delete":
        return googleDeleteEventId
          ? _deleteGcal(plan.event.user!, googleDeleteEventId)
          : true;
      default:
        throw error(
          GenericError.DeveloperError,
          `Unknown Google effect for Compass transition: ${plan.transitionKey}`,
        );
    }
  }
}
