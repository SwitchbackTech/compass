import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { type CompassEvent } from "@core/types/compass-event.contracts";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import { GRID_TIME_STEP } from "@web/grid/grid.constants";

export interface EventNudgeMovement {
  days: number;
  minutes: number;
}

export const getArrowKeyMovement = (
  key: string,
  isAllDay: boolean,
): EventNudgeMovement | null => {
  switch (key) {
    case "ArrowLeft":
      return { days: -1, minutes: 0 };
    case "ArrowRight":
      return { days: 1, minutes: 0 };
    case "ArrowUp":
      return isAllDay ? null : { days: 0, minutes: -GRID_TIME_STEP };
    case "ArrowDown":
      return isAllDay ? null : { days: 0, minutes: GRID_TIME_STEP };
    default:
      return null;
  }
};

export const isTimedEventInsideOneDay = (start: Dayjs, end: Dayjs) => {
  const midnightAfterStart = start.add(1, "day").startOf("day");

  return end.isSame(start, "day") || end.isSame(midnightAfterStart);
};

/** Timed events that cross midnight render in the all-day row (Google-style). */
export const isTimedEventMultiDay = (start: Dayjs, end: Dayjs) =>
  !isTimedEventInsideOneDay(start, end);

/**
 * Maps a multi-day timed range onto an exclusive all-day date span for the
 * all-day row. Inclusive coverage is every calendar day that contains any
 * part of [start, end); exclusive end is the day after the last of those.
 */
export const timedMultiDayToAllDayDates = (
  start: Dayjs,
  end: Dayjs,
): { startDate: string; endDate: string } => {
  const endDayStart = end.startOf("day");
  const exclusiveEnd = end.isSame(endDayStart)
    ? endDayStart
    : endDayStart.add(1, "day");

  return {
    startDate: start.startOf("day").format(YEAR_MONTH_DAY_FORMAT),
    endDate: exclusiveEnd.format(YEAR_MONTH_DAY_FORMAT),
  };
};

export const nudgeEventDates = (
  event: Pick<CompassEvent, "startDate" | "endDate" | "isAllDay">,
  movement: EventNudgeMovement,
): { startDate: string; endDate: string } | null => {
  if (!event.startDate || !event.endDate) return null;
  if (event.isAllDay && movement.minutes !== 0) return null;

  const nextStart = dayjs(event.startDate)
    .add(movement.days, "day")
    .add(movement.minutes, "minutes");
  const nextEnd = dayjs(event.endDate)
    .add(movement.days, "day")
    .add(movement.minutes, "minutes");

  if (!event.isAllDay && !isTimedEventInsideOneDay(nextStart, nextEnd)) {
    return null;
  }

  if (event.isAllDay) {
    return {
      startDate: nextStart.format(YEAR_MONTH_DAY_FORMAT),
      endDate: nextEnd.format(YEAR_MONTH_DAY_FORMAT),
    };
  }

  return { startDate: nextStart.format(), endDate: nextEnd.format() };
};
