import { type ClientSession } from "mongodb";
import { type Schema_Event, type WithCompassId } from "@core/types/event.types";
import {
  type CompassOperationPlan,
  type CompassPersistenceStep,
} from "@backend/event/classes/compass.event.parser";
import {
  _createCompassEvent,
  _deleteInstancesAfterUntil,
  _deleteSeries,
  _deleteSingleCompassEvent,
  _updateCompassEvent,
  _updateCompassSeries,
} from "@backend/event/services/event.service";
import { type Event_Transition } from "@backend/sync/sync.types";

export type CompassApplyResult = {
  applied: boolean;
  summary: Event_Transition;
  persistedEvent?: WithCompassId<Omit<Schema_Event, "_id">>;
  googleDeleteEventId?: string;
};

async function executeStep(
  plan: CompassOperationPlan,
  step: CompassPersistenceStep,
  session?: ClientSession,
): Promise<WithCompassId<Omit<Schema_Event, "_id">> | undefined> {
  switch (step.type) {
    case "create":
      return _createCompassEvent(
        { ...step.event, user: step.event.user! },
        plan.provider,
        step.rrule,
        session,
      );
    case "update":
      return _updateCompassEvent(
        { ...step.event, user: step.event.user! },
        session,
      );
    case "update_series":
      return _updateCompassSeries(
        { ...step.event, user: step.event.user! },
        session,
      );
    case "delete_single":
      return _deleteSingleCompassEvent(
        { ...step.event, user: step.event.user! },
        session,
      );
    case "delete_series":
      await _deleteSeries(step.userId, step.baseId, session, step.keepBase);

      return undefined;
    case "delete_instances_after_until":
      await _deleteInstancesAfterUntil(
        step.userId,
        step.baseId,
        step.until,
        session,
      );

      return undefined;
  }
}

export async function applyCompassPlan(
  plan: CompassOperationPlan,
  session?: ClientSession,
): Promise<CompassApplyResult> {
  const summary: Event_Transition = {
    ...plan.summary,
    operation: plan.operation,
  };

  let persistedEvent: WithCompassId<Omit<Schema_Event, "_id">> | undefined;

  for (const step of plan.steps) {
    const result = await executeStep(plan, step, session);

    if (result) {
      persistedEvent = result;
    }
  }

  if (plan.clearRecurrenceBeforeGoogleUpdate && persistedEvent) {
    Object.assign(persistedEvent, { recurrence: null });
  }

  return {
    applied: true,
    summary,
    persistedEvent,
    googleDeleteEventId:
      persistedEvent?.gEventId ??
      (plan.googleEffect.type === "delete"
        ? plan.googleEffect.deleteEventId
        : undefined),
  };
}
