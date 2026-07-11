import { type ObjectId } from "mongodb";
import {
  type DeletePlan,
  type ReplacePlan,
  type TransitionPlan,
} from "@backend/event/classes/compass.event.parser";
import { type EventRecord } from "@backend/event/event.record";
import { materializeSeriesInstances } from "@backend/event/services/recur/util/recur.util";

export type MaterializedMutation = {
  upsert: EventRecord[];
  deleteIds: ObjectId[];
  /** The record to surface in the mutation response / to propagation. */
  primary: EventRecord;
};

/**
 * Expands a replace/delete/transition plan into concrete records to persist.
 * Pure: any RRULE expansion for a (re)created series happens here.
 */
export function generateReplace(plan: ReplacePlan): MaterializedMutation {
  switch (plan.kind) {
    case "replaceThis":
      return { upsert: [plan.updated], deleteIds: [], primary: plan.updated };
    case "replaceSeries": {
      const instances =
        plan.updatedBase.recurrence.kind === "series"
          ? materializeSeriesInstances(plan.updatedBase)
          : [];
      return {
        upsert: [plan.updatedBase, ...instances],
        deleteIds: plan.deleteInstanceIds,
        primary: plan.updatedBase,
      };
    }
    case "replaceSplit": {
      const newInstances =
        plan.newBase.recurrence.kind === "series"
          ? materializeSeriesInstances(plan.newBase)
          : [];
      return {
        upsert: [plan.truncatedBase, plan.newBase, ...newInstances],
        deleteIds: plan.deleteInstanceIds,
        primary: plan.newBase,
      };
    }
  }
}

export function generateDelete(plan: DeletePlan): {
  deleteIds: ObjectId[];
  upsert: EventRecord[];
  deleteSeriesId: ObjectId | null;
  primary: EventRecord | null;
} {
  switch (plan.kind) {
    case "deleteThis":
      return {
        deleteIds: [plan.target._id],
        upsert: [],
        deleteSeriesId: null,
        primary: plan.target,
      };
    case "deleteSeries":
      return {
        deleteIds: [],
        upsert: [],
        deleteSeriesId: plan.seriesId,
        primary: null,
      };
    case "deleteSplit":
      return {
        deleteIds: plan.deleteInstanceIds,
        upsert: [plan.truncatedBase],
        deleteSeriesId: null,
        primary: null,
      };
  }
}

export function generateTransition(plan: TransitionPlan): MaterializedMutation {
  return {
    upsert: [plan.updated],
    deleteIds: plan.deletedInstanceIds,
    primary: plan.updated,
  };
}
