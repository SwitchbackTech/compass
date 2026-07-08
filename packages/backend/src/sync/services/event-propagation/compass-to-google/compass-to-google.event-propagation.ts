import { type ClientSession, ObjectId } from "mongodb";
import {
  EVENT_CHANGED,
  SOMEDAY_EVENT_CHANGED,
} from "@core/constants/sse.constants";
import { Logger } from "@core/logger/winston.logger";
import { type CompassEvent } from "@core/types/event.types";
import { GenericError } from "@backend/common/errors/generic/generic.errors";
import { error } from "@backend/common/errors/handlers/error.handler";
import mongoService from "@backend/common/services/mongo.service";
import {
  applyCompassPlan,
  type CompassApplyResult,
} from "@backend/event/classes/compass.event.executor";
import { CompassEventFactory } from "@backend/event/classes/compass.event.generator";
import {
  analyzeCompassTransition,
  type CompassOperationPlan,
} from "@backend/event/classes/compass.event.parser";
import {
  _createGcal,
  _deleteGcal,
  _updateGcal,
} from "@backend/event/services/event.service";
import { sseServer } from "@backend/servers/sse/sse.server";
import { isMissingGoogleRefreshToken } from "@backend/sync/services/google-sync/google-sync.errors";
import { type Event_Transition } from "@backend/sync/sync.types";
import {
  isPersistedCoreEvent,
  type PersistedCompassEvent,
} from "./compass-to-google.event-propagation.util";

const logger = Logger("app:compass-to-google.event-propagation");

type AppliedCompassChange = {
  plan: CompassOperationPlan;
  applyResult: CompassApplyResult;
};

export class CompassToGoogleEventPropagation {
  static async processEvents(
    events: CompassEvent[],
  ): Promise<Event_Transition[]> {
    logger.debug(`Processing ${events.length} event(s)...`);

    const session = await mongoService.startSession();

    try {
      // The transaction covers only the Mongo writes. withTransaction retries
      // the callback on TransientTransactionError (a WriteConflict with a
      // concurrent write — e.g. a Google webhook import triggered by the
      // previous save of the same event), so the Google calls must stay
      // outside it: they would repeat on retry, and awaiting network I/O
      // inside an open transaction is what made conflicts likely to begin
      // with.
      const applied = await session.withTransaction(async (session) => {
        const compassEvents = (
          await Promise.all(
            events.map((event) =>
              CompassEventFactory.generateEvents(event, session),
            ),
          )
        ).flat();

        const results: AppliedCompassChange[] = [];

        for (const event of compassEvents) {
          const change = await CompassToGoogleEventPropagation.applyChange(
            event,
            session,
          );

          if (change) results.push(change);
        }

        return results;
      });

      const summary: Event_Transition[] = [];

      for (const { plan, applyResult } of applied) {
        const didExecuteGoogleEffect =
          await CompassToGoogleEventPropagation.executeGoogleEffect(
            plan,
            applyResult,
          );

        if (didExecuteGoogleEffect) summary.push(applyResult.summary);
      }

      CompassToGoogleEventPropagation.notifyClients(events, summary);

      return summary;
    } finally {
      await session.endSession();
    }
  }

  private static getNotificationType(
    this: void,
    { transition: [from, to] }: Event_Transition,
  ): Array<typeof EVENT_CHANGED | typeof SOMEDAY_EVENT_CHANGED> {
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
      ...new Set(
        summary.flatMap(CompassToGoogleEventPropagation.getNotificationType),
      ),
    ];

    const uniqueUserIds = new Set(events.map((e) => e.payload.user));

    uniqueUserIds.forEach((userId) => {
      notifications.forEach((notification) => {
        switch (notification) {
          case EVENT_CHANGED:
            sseServer.handleBackgroundCalendarChange(userId);
            break;
          case SOMEDAY_EVENT_CHANGED:
            sseServer.handleBackgroundSomedayChange(userId);
            break;
          default:
            logger.error(`Unknown notification type for user: ${userId}`);
        }
      });
    });
  }

  private static async applyChange(
    event: CompassEvent,
    session?: ClientSession,
  ): Promise<AppliedCompassChange | null> {
    const eventId = event.payload._id;
    const dbEvent = await mongoService.event.findOne(
      { _id: new ObjectId(eventId), user: event.payload.user },
      { session },
    );
    const plan = analyzeCompassTransition(event, dbEvent);
    const transition = plan.transitionKey;

    logger.info(`Handle Compass event(${eventId}): ${transition}`);

    const applyResult = await applyCompassPlan(plan, session);

    return applyResult.applied ? { plan, applyResult } : null;
  }

  private static async executeGoogleEffect(
    plan: CompassOperationPlan,
    { googleDeleteEventId, persistedEvent }: CompassApplyResult,
  ): Promise<boolean> {
    try {
      return await CompassToGoogleEventPropagation.handleGoogleEffectByType(
        plan,
        persistedEvent,
        googleDeleteEventId,
      );
    } catch (err) {
      if (isMissingGoogleRefreshToken(err)) {
        logger.info(
          `Skipping Google effect for user ${plan.event.user} because Google is not connected.`,
        );
        return true;
      }

      throw err;
    }
  }

  private static async handleGoogleEffectByType(
    plan: CompassOperationPlan,
    persistedEvent: PersistedCompassEvent,
    googleDeleteEventId: string | undefined,
  ): Promise<boolean> {
    switch (plan.googleEffect.type) {
      case "none":
        return true;
      case "create":
        if (!isPersistedCoreEvent(persistedEvent)) return false;
        await _createGcal(persistedEvent.user, persistedEvent);
        return true;
      case "update":
        if (!isPersistedCoreEvent(persistedEvent)) return false;
        await _updateGcal(persistedEvent.user, persistedEvent);
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
