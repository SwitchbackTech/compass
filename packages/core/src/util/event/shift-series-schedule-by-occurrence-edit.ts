import { DateOnlySchema, DateTimeSchema } from "@core/types/domain-primitives";
import { type EventSchedule } from "@core/types/event.contracts";
import dayjs from "@core/util/date/dayjs";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Apply an occurrence edit's schedule delta onto the series base.
 *
 * Clients send the occurrence's absolute schedule on replace. Treating that
 * absolute value as the series DTSTART would shift the whole series by the
 * occurrence's offset from the master. Infer the pre-edit occurrence end from
 * the master's duration so a duration change on the occurrence still
 * propagates.
 *
 * Kind flips (timed ↔ allDay) return `edited` unchanged — there is no
 * unambiguous delta onto a differently-shaped master schedule.
 */
export function shiftSeriesScheduleByOccurrenceEdit(
  base: EventSchedule,
  occurrenceStart: string,
  edited: EventSchedule,
): EventSchedule {
  if (base.kind !== edited.kind) {
    return edited;
  }

  if (base.kind === "timed" && edited.kind === "timed") {
    const originalStart = dayjs(occurrenceStart);
    const originalEnd = originalStart.add(
      dayjs(base.end).diff(base.start),
      "millisecond",
    );
    const startDelta = dayjs(edited.start).diff(originalStart);
    const endDelta = dayjs(edited.end).diff(originalEnd);
    if (
      startDelta === 0 &&
      endDelta === 0 &&
      base.timeZone === edited.timeZone
    ) {
      return base;
    }
    return {
      kind: "timed",
      start: DateTimeSchema.parse(
        dayjs(base.start).add(startDelta, "millisecond").format(),
      ),
      end: DateTimeSchema.parse(
        dayjs(base.end).add(endDelta, "millisecond").format(),
      ),
      timeZone: edited.timeZone,
    };
  }

  // allDay: occurrence ids embed midnight-Z; schedules use YYYY-MM-DD.
  const originalStart = dayjs(occurrenceStart).utc().format("YYYY-MM-DD");
  const baseDurationDays = dayjs(base.end).diff(base.start, "day");
  const originalEnd = dayjs(originalStart)
    .add(baseDurationDays, "day")
    .format("YYYY-MM-DD");
  const startDeltaDays = Math.round(
    dayjs(edited.start).diff(dayjs(originalStart)) / MS_PER_DAY,
  );
  const endDeltaDays = Math.round(
    dayjs(edited.end).diff(dayjs(originalEnd)) / MS_PER_DAY,
  );
  if (startDeltaDays === 0 && endDeltaDays === 0) {
    return base;
  }
  return {
    kind: "allDay",
    start: DateOnlySchema.parse(
      dayjs(base.start).add(startDeltaDays, "day").format("YYYY-MM-DD"),
    ),
    end: DateOnlySchema.parse(
      dayjs(base.end).add(endDeltaDays, "day").format("YYYY-MM-DD"),
    ),
  };
}
