import { type ObjectId } from "mongodb";
import {
  type DeleteEventInput,
  type ReplaceEventInput,
  type TransitionEventInput,
} from "@core/types/event-command.contracts";
import { eventMutationError } from "@backend/event/event.error";
import { type EventRecord } from "@backend/event/event.record";
import { withUntil } from "@backend/event/services/recur/util/recur.util";

const conflict = (message: string) =>
  eventMutationError("RECURRENCE_CONFLICT", message);

/**
 * Defense-in-depth for A6 (calendar assignment is immutable, so every
 * materialized instance always copies its base's calendarId): no current
 * code path can actually construct a series whose instances span more than
 * one calendar, but an apply-to-series operation (scope "all" or
 * "thisAndFollowing") trusts `series.instances` wholesale, so a corrupted or
 * hand-edited document here would otherwise silently mutate/delete events on
 * a calendar the caller never asked to touch. Fail loudly instead (packet 05
 * step 7).
 */
const assertSeriesCalendarConsistency = (
  series: SeriesContext | null,
): void => {
  if (!series) return;
  const drifted = series.instances.find(
    (instance) => !instance.calendarId.equals(series.base.calendarId),
  );
  if (drifted) {
    throw conflict(
      `Series ${series.base._id.toHexString()} has an instance (${drifted._id.toHexString()}) on a different calendar than its base; refusing to apply a series-wide operation.`,
    );
  }
};

const scheduleStartMs = (schedule: EventRecord["schedule"]): number => {
  if (schedule.kind === "timed") return schedule.start.getTime();
  if (schedule.kind === "allDay") {
    return new Date(`${schedule.start}T00:00:00.000Z`).getTime();
  }
  return 0;
};

/**
 * A recurring series in context: the base document plus its currently
 * materialized instances.
 */
export type SeriesContext = { base: EventRecord; instances: EventRecord[] };

export type ReplacePlan =
  | { kind: "replaceThis"; updated: EventRecord }
  | {
      kind: "replaceSeries";
      updatedBase: EventRecord;
      deleteInstanceIds: ObjectId[];
    }
  | {
      kind: "replaceSplit";
      truncatedBase: EventRecord;
      deleteInstanceIds: ObjectId[];
      newBase: EventRecord;
    };

export type DeletePlan =
  | { kind: "deleteThis"; target: EventRecord }
  | { kind: "deleteSeries"; seriesId: ObjectId }
  | {
      kind: "deleteSplit";
      truncatedBase: EventRecord;
      deleteInstanceIds: ObjectId[];
    };

export type TransitionPlan =
  | { kind: "schedule"; updated: EventRecord; deletedInstanceIds: ObjectId[] }
  | {
      kind: "unschedule";
      updated: EventRecord;
      deletedInstanceIds: ObjectId[];
    };

const applyEditableFields = (
  event: EventRecord,
  input: Pick<ReplaceEventInput, "content" | "schedule" | "priority">,
  now: Date,
): EventRecord => ({
  ...event,
  content: input.content,
  schedule:
    input.schedule.kind === "timed"
      ? {
          kind: "timed",
          start: new Date(input.schedule.start),
          end: new Date(input.schedule.end),
          timeZone: input.schedule.timeZone,
        }
      : input.schedule,
  priority: input.priority,
  updatedAt: now,
});

/**
 * Builds the replace plan for a mutation request. Pure: takes the already
 * resolved target event plus its series context (when applicable, fetched
 * by the caller through the event repository) and produces a description
 * of what must change; the generator materializes it, the executor
 * persists it.
 */
export function analyzeReplace(
  target: EventRecord,
  series: SeriesContext | null,
  input: ReplaceEventInput,
  now: Date,
): ReplacePlan {
  assertSeriesCalendarConsistency(series);
  const { scope } = input;

  if (scope === "this") {
    if (target.recurrence.kind === "series") {
      throw conflict(
        'A series base cannot be edited with scope "this"; use "all" or "thisAndFollowing".',
      );
    }

    const recurrence =
      target.recurrence.kind === "occurrence"
        ? target.recurrence
        : input.recurrence.kind === "series"
          ? { kind: "series" as const, rules: input.recurrence.rules }
          : { kind: "single" as const };

    return {
      kind: "replaceThis",
      updated: { ...applyEditableFields(target, input, now), recurrence },
    };
  }

  if (scope === "all") {
    const base = series?.base ?? target;
    const instanceIds = (series?.instances ?? []).map((i) => i._id);

    const recurrence =
      input.recurrence.kind === "series"
        ? { kind: "series" as const, rules: input.recurrence.rules }
        : input.recurrence.kind === "single"
          ? { kind: "single" as const }
          : base.recurrence;

    const updatedBase: EventRecord = {
      ...applyEditableFields(base, input, now),
      recurrence,
    };

    return {
      kind: "replaceSeries",
      updatedBase,
      deleteInstanceIds: instanceIds,
    };
  }

  // scope === "thisAndFollowing"
  if (target.recurrence.kind !== "occurrence" || !series) {
    // No earlier occurrences exist relative to a base/single event; the
    // whole thing transitions, same as "all".
    return analyzeReplace(target, series, { ...input, scope: "all" }, now);
  }

  const { base, instances } = series;
  const cutoffMs = scheduleStartMs(target.schedule) - 1;

  const followingInstanceIds = instances
    .filter((instance) => scheduleStartMs(instance.schedule) >= cutoffMs + 1)
    .map((i) => i._id);

  const truncatedBase: EventRecord =
    base.recurrence.kind === "series"
      ? {
          ...base,
          recurrence: {
            kind: "series",
            rules: withUntil(base.recurrence.rules, new Date(cutoffMs)),
          },
          updatedAt: now,
        }
      : base;

  const recurrence =
    input.recurrence.kind === "series"
      ? { kind: "series" as const, rules: input.recurrence.rules }
      : { kind: "single" as const };

  const newBase: EventRecord = {
    ...applyEditableFields(target, input, now),
    _id: target._id,
    recurrence,
  };

  return {
    kind: "replaceSplit",
    truncatedBase,
    deleteInstanceIds: followingInstanceIds,
    newBase,
  };
}

export function analyzeDelete(
  target: EventRecord,
  series: SeriesContext | null,
  input: DeleteEventInput,
): DeletePlan {
  assertSeriesCalendarConsistency(series);
  const { scope } = input;

  if (scope === "this") {
    if (target.recurrence.kind === "series") {
      throw conflict(
        'A series base cannot be deleted with scope "this"; use "all".',
      );
    }
    return { kind: "deleteThis", target };
  }

  if (scope === "all") {
    const seriesId = series?.base._id ?? target._id;
    return { kind: "deleteSeries", seriesId };
  }

  // scope === "thisAndFollowing"
  if (target.recurrence.kind !== "occurrence" || !series) {
    const seriesId = series?.base._id ?? target._id;
    return { kind: "deleteSeries", seriesId };
  }

  const { base, instances } = series;
  const cutoffMs = scheduleStartMs(target.schedule);

  const followingInstanceIds = instances
    .filter((instance) => scheduleStartMs(instance.schedule) >= cutoffMs)
    .map((i) => i._id)
    .concat(target._id);

  const truncatedBase: EventRecord =
    base.recurrence.kind === "series"
      ? {
          ...base,
          recurrence: {
            kind: "series",
            rules: withUntil(base.recurrence.rules, new Date(cutoffMs - 1)),
          },
          updatedAt: new Date(),
        }
      : base;

  return {
    kind: "deleteSplit",
    truncatedBase,
    deleteInstanceIds: followingInstanceIds,
  };
}

export function analyzeTransition(
  target: EventRecord,
  input: TransitionEventInput,
  targetCalendarId: ObjectId | null,
  now: Date,
): TransitionPlan {
  if (target.recurrence.kind === "occurrence") {
    throw conflict(
      'An occurrence cannot transition on its own; edit the series (scope "all").',
    );
  }

  if (input.kind === "schedule") {
    if (!targetCalendarId) {
      throw conflict("Target calendar for schedule transition is required.");
    }
    return {
      kind: "schedule",
      updated: {
        ...target,
        calendarId: targetCalendarId,
        schedule:
          input.schedule.kind === "timed"
            ? {
                kind: "timed",
                start: new Date(input.schedule.start),
                end: new Date(input.schedule.end),
                timeZone: input.schedule.timeZone,
              }
            : input.schedule,
        externalReference: null,
        updatedAt: now,
      },
      deletedInstanceIds: [],
    };
  }

  return {
    kind: "unschedule",
    updated: {
      ...target,
      calendarId: targetCalendarId ?? target.calendarId,
      schedule: input.schedule,
      recurrence: { kind: "single" },
      externalReference: null,
      updatedAt: now,
    },
    deletedInstanceIds: [],
  };
}
