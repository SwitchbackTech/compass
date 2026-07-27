import { ObjectId } from "bson";
import { GCAL_MAX_RECURRENCES } from "@core/constants/core.constants";
import {
  DateOnlySchema,
  DateTimeSchema,
  type EventId,
} from "@core/types/domain-primitives";
import { type Event, type EventSchedule } from "@core/types/event.contracts";
import { type RecurrenceScope } from "@core/types/event-command.contracts";
import dayjs from "@core/util/date/dayjs";
import { CompassEventRRule } from "@core/util/event/compass.event.rrule";
import { getCompassEventDateFormat } from "@core/util/event/event.util";

export type RecurringEditProjection = {
  removeIds: ReadonlySet<string>;
  upserts: readonly Event[];
};

type ProjectRecurringEditInput = {
  scope: RecurrenceScope;
  edited: Event;
  original: Event;
  seriesEvents: readonly Event[];
};

// Instances keep their own `occurrence` recurrence pointer; only content
// propagates from the edit. The series base (and a standalone "single"
// edited into a series) take the edited recurrence itself.
const seriesPatch = (event: Event, edited: Event): Event => ({
  ...event,
  content: edited.content,
  recurrence:
    event.recurrence.kind === "occurrence"
      ? event.recurrence
      : edited.recurrence,
});

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// When the edit flips timed ↔ allDay, millisecond deltas across kinds produce
// full-day timed ghosts (or invalid allDay strings). Copy the edited schedule
// onto each instance, shifted by that instance's day offset from the original
// occurrence so the edited card keeps `edited.schedule` and siblings keep
// their relative days.
const convertScheduleKind = (
  event: Event,
  original: Event,
  edited: Event,
): EventSchedule => {
  const dayOffset = dayjs(event.schedule.start)
    .startOf("day")
    .diff(dayjs(original.schedule.start).startOf("day"), "day");

  const { schedule } = edited;
  if (schedule.kind === "allDay") {
    return {
      kind: "allDay",
      start: DateOnlySchema.parse(
        dayjs(schedule.start).add(dayOffset, "day").toYearMonthDayString(),
      ),
      end: DateOnlySchema.parse(
        dayjs(schedule.end).add(dayOffset, "day").toYearMonthDayString(),
      ),
    };
  }

  // Shift by calendar day in the event's zone so DST transitions keep the
  // same wall-clock time (plain `.add(n, "day")` on an offset string is a
  // fixed 24h step and drifts across spring-forward / fall-back).
  const shiftTimed = (value: string) => {
    const local = dayjs(value).tz(schedule.timeZone);
    return DateTimeSchema.parse(
      dayjs
        .tz(
          `${local.add(dayOffset, "day").format("YYYY-MM-DD")}T${local.format("HH:mm:ss")}`,
          schedule.timeZone,
        )
        .format(),
    );
  };

  return {
    kind: "timed",
    start: shiftTimed(schedule.start),
    end: shiftTimed(schedule.end),
    timeZone: schedule.timeZone,
  };
};

// Shift every affected instance by the drag's delta so the change renders
// optimistically. Both series-wide scopes shift by the same delta; they
// differ only in which instances are affected (computed by the caller). Each
// instance shifts relative to its own time, and the dragged instance — still
// at its old time in the cache here — lands on the edited time because
// (old + (edited - original)) === edited.
const shiftEvent = (event: Event, original: Event, edited: Event): Event => {
  if (edited.schedule.kind !== original.schedule.kind) {
    return {
      ...event,
      schedule: convertScheduleKind(event, original, edited),
    };
  }

  const startDelta = dayjs(edited.schedule.start).diff(original.schedule.start);
  const endDelta = dayjs(edited.schedule.end).diff(original.schedule.end);

  if (event.schedule.kind === "timed") {
    return {
      ...event,
      schedule: {
        ...event.schedule,
        start: dayjs(event.schedule.start)
          .add(startDelta, "milliseconds")
          .format(),
        end: dayjs(event.schedule.end).add(endDelta, "milliseconds").format(),
      } as Event["schedule"],
    };
  }

  // allDay: DateOnly strings, shifted by whole days.
  return {
    ...event,
    schedule: {
      ...event.schedule,
      start: dayjs(event.schedule.start)
        .add(Math.round(startDelta / MS_PER_DAY), "day")
        .format("YYYY-MM-DD"),
      end: dayjs(event.schedule.end)
        .add(Math.round(endDelta / MS_PER_DAY), "day")
        .format("YYYY-MM-DD"),
    } as Event["schedule"],
  };
};

const isAtOrAfter = (event: Event, cutoff: Event["schedule"]) => {
  return !dayjs(event.schedule.start).isBefore(cutoff.start);
};

export function projectRecurringEdit({
  scope,
  edited,
  original,
  seriesEvents,
}: ProjectRecurringEditInput): RecurringEditProjection {
  if (scope === "this") {
    return { removeIds: new Set(), upserts: [edited] };
  }

  const affected =
    scope === "all"
      ? seriesEvents
      : seriesEvents.filter((event) => isAtOrAfter(event, original.schedule));

  // Downgrading a series/occurrence to a standalone single event: drop every
  // other affected instance and keep only the edited one.
  if (edited.recurrence.kind === "single") {
    return {
      removeIds: new Set(
        affected.flatMap((event) => (event.id === edited.id ? [] : [event.id])),
      ),
      upserts: [edited],
    };
  }

  const upserts = affected.map((event) =>
    shiftEvent(seriesPatch(event, edited), original, edited),
  );

  return { removeIds: new Set(), upserts };
}

type ProjectRecurringDeleteInput = {
  scope: Exclude<RecurrenceScope, "this">;
  target: Event;
  seriesId: string;
  seriesEvents: readonly Event[];
};

// `seriesEvents` (from findSeriesEventsInCache) holds occurrences only, so the
// series base is added back explicitly. It's only removed for "all" — the
// backend keeps the base's earlier instances (and the base itself) intact
// when truncating a "thisAndFollowing" delete.
export function projectRecurringDelete({
  scope,
  target,
  seriesId,
  seriesEvents,
}: ProjectRecurringDeleteInput): RecurringEditProjection {
  const affected =
    scope === "all"
      ? seriesEvents
      : seriesEvents.filter((event) => isAtOrAfter(event, target.schedule));

  const removeIds = new Set<string>(affected.map((event) => event.id));
  removeIds.add(target.id);
  if (scope === "all") removeIds.add(seriesId);

  return { removeIds, upserts: [] };
}

// Deterministic occurrence ids (`${seriesId}::${start}`) keep repeated
// projections idempotent and give local mode stable ids across refetches.
// EventId is opaque client-side, so the composed shape is legal; the server
// swaps them for real ids at the settle refetch in remote mode.
export function composeOccurrenceId(seriesId: string, start: string): EventId {
  return `${seriesId}::${start}` as EventId;
}

// Split at the LAST "::": a this-and-following split creates a series whose
// own id is already composed, so its occurrences nest another segment.
export function parseOccurrenceId(
  id: string,
): { seriesId: EventId; start: string } | null {
  const separator = id.lastIndexOf("::");
  if (separator <= 0 || separator + 2 >= id.length) return null;
  return {
    seriesId: id.slice(0, separator) as EventId,
    start: id.slice(separator + 2),
  };
}

type ProjectSeriesMaterializationInput = {
  /** The series base; `recurrence.kind` must be "series" to expand. */
  base: Event;
  /** Stale cached instances of this series to purge (old rules). */
  cachedSeriesEvents?: readonly Event[];
  /** Ranges worth materializing into (typically the cached query ranges). */
  ranges: readonly { start: string; end: string }[];
  /** Occurrence starts (in the base's schedule format) to skip. */
  exdates?: readonly string[];
};

/**
 * Expand a series base's RRULE into concrete occurrence events so a
 * create/edit that (re)defines recurrence renders instantly instead of after
 * the server round trip. Mirrors the server's materialization: the first
 * occurrence is a real instance and the base stays metadata-only (the grid
 * filters `kind === "series"`). Expansion is bounded by the latest range end
 * and the server's 730-instance cap; per-entry range membership is enforced
 * downstream by `applyEventProjectionAcrossQueries`.
 */
export function projectSeriesMaterialization({
  base,
  cachedSeriesEvents = [],
  ranges,
  exdates = [],
}: ProjectSeriesMaterializationInput): RecurringEditProjection {
  const removeIds = new Set<string>(
    cachedSeriesEvents.flatMap((event) =>
      event.id === base.id ? [] : [event.id],
    ),
  );

  if (base.recurrence.kind !== "series" || ranges.length === 0) {
    return { removeIds, upserts: [base] };
  }

  try {
    const rrule = new CompassEventRRule({
      _id: new ObjectId(),
      startDate: base.schedule.start,
      endDate: base.schedule.end,
      recurrence: { rule: [...base.recurrence.rules] },
    });

    const format = getCompassEventDateFormat(base.schedule.start);
    const durationMs = dayjs(base.schedule.end).diff(
      base.schedule.start,
      "milliseconds",
    );
    const maxEnd = ranges
      .map((range) => dayjs(range.end))
      .reduce((latest, end) => (end.isAfter(latest) ? end : latest));
    const excluded = new Set(exdates);

    const instances = rrule
      .all(
        (date, index) =>
          index < GCAL_MAX_RECURRENCES && dayjs(date).isBefore(maxEnd),
      )
      .flatMap((date) => {
        const start = dayjs(date).format(format);
        if (excluded.has(start)) return [];
        return [
          {
            ...base,
            id: composeOccurrenceId(base.id, start),
            schedule: {
              ...base.schedule,
              start,
              end: dayjs(date).add(durationMs, "milliseconds").format(format),
            } as Event["schedule"],
            recurrence: { kind: "occurrence", seriesId: base.id },
          } satisfies Event,
        ];
      });

    return { removeIds, upserts: [base, ...instances] };
  } catch {
    return { removeIds, upserts: [base] };
  }
}
