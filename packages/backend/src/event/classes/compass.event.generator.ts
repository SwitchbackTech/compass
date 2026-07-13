import { type ObjectId } from "mongodb";
import {
  type DeletePlan,
  type ReplacePlan,
} from "@backend/event/classes/compass.event.parser";
import { type EventRecord } from "@backend/event/event.record";
import { materializeSeriesInstances } from "@backend/event/services/recur/util/recur.util";

export type MaterializedMutation = {
  upsert: EventRecord[];
  deleteIds: ObjectId[];
  /** The record to surface in the mutation response / to propagation. */
  primary: EventRecord;
};

const materializeIfSeries = (base: EventRecord): EventRecord[] =>
  base.recurrence.kind === "series" ? materializeSeriesInstances(base) : [];

/**
 * Expands a replace/delete plan into concrete records to persist. Pure: any
 * RRULE expansion for a (re)created series happens here.
 */
export function generateReplace(plan: ReplacePlan): MaterializedMutation {
  switch (plan.kind) {
    case "replaceThis":
      return { upsert: [plan.updated], deleteIds: [], primary: plan.updated };
    case "replaceSeries":
      return {
        upsert: [plan.updatedBase, ...materializeIfSeries(plan.updatedBase)],
        deleteIds: plan.deleteInstanceIds,
        primary: plan.updatedBase,
      };
    case "replaceSplit":
      return {
        upsert: [
          plan.truncatedBase,
          plan.newBase,
          ...materializeIfSeries(plan.newBase),
        ],
        deleteIds: plan.deleteInstanceIds,
        primary: plan.newBase,
      };
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
