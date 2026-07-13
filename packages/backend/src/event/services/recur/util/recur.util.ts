import { ObjectId } from "mongodb";
import { rrulestr } from "rrule";
import { GCAL_MAX_RECURRENCES } from "@core/constants/core.constants";
import { type DateOnly } from "@core/types/domain-primitives";
import {
  type EventRecord,
  type EventScheduleRecord,
} from "@backend/event/event.record";

const shiftSchedule = (
  schedule: EventScheduleRecord,
  offsetMs: number,
): EventScheduleRecord => {
  if (schedule.kind === "timed") {
    return {
      kind: "timed",
      start: new Date(schedule.start.getTime() + offsetMs),
      end: new Date(schedule.end.getTime() + offsetMs),
      timeZone: schedule.timeZone,
    };
  }

  const offsetDays = Math.round(offsetMs / (24 * 60 * 60 * 1000));
  return {
    kind: "allDay",
    start: shiftDateOnly(schedule.start, offsetDays),
    end: shiftDateOnly(schedule.end, offsetDays),
  };
};

const shiftDateOnly = (dateOnly: DateOnly, offsetDays: number): DateOnly => {
  const date = new Date(`${dateOnly}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10) as DateOnly;
};

/**
 * The instant a schedule occupies in the recurrence pattern: the timed
 * instant itself, or midnight UTC of the all-day date. Shared by series
 * materialization (below) and by Compass->Google propagation, which anchors
 * an unresolved occurrence's `events.instances` lookup on this same instant
 * (Google's `originalStartTime`, B-series/packet-05 step 4).
 */
export const getAnchorDate = (schedule: EventScheduleRecord): Date => {
  if (schedule.kind === "timed") return schedule.start;
  return new Date(`${schedule.start}T00:00:00.000Z`);
};

/**
 * Materializes every occurrence instance for a series base, including the
 * first (B6: instances stay MATERIALIZED, not virtual; the base itself is
 * metadata-only and never rendered -- see gridEventsFrom on the web side).
 * The base document is not included in the result. Capped at
 * GCAL_MAX_RECURRENCES as a safety bound against unbounded RRULEs (matches
 * the Google-side cap the app already respects).
 */
export const materializeSeriesInstances = (
  base: EventRecord,
  maxInstances: number = GCAL_MAX_RECURRENCES,
): EventRecord[] => {
  if (base.recurrence.kind !== "series") return [];

  const anchor = getAnchorDate(base.schedule);
  const rule = rrulestr(base.recurrence.rules.join("\n"), {
    dtstart: anchor,
  });
  const dates = rule.all((_date, len) => len < maxInstances);

  return dates.map((date) => ({
    _id: new ObjectId(),
    calendarId: base.calendarId,
    content: base.content,
    schedule: shiftSchedule(base.schedule, date.getTime() - anchor.getTime()),
    recurrence: { kind: "occurrence", seriesId: base._id },
    priority: base.priority,
    externalReference: null,
    createdAt: base.createdAt,
    updatedAt: base.updatedAt,
  }));
};

export const withUntil = (rules: readonly string[], until: Date): string[] => {
  const untilString = `${until
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "")}`;

  return rules.map((rule) =>
    /UNTIL=/.test(rule)
      ? rule.replace(/UNTIL=[^;]+/, `UNTIL=${untilString}`)
      : `${rule};UNTIL=${untilString}`,
  );
};
