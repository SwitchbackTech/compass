import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { type Schema_Event } from "@core/types/event.types";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import { CALENDAR_GRID_TIME_STEP } from "@web/layout/calendar-grid/calendarGrid.constants";

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
      return isAllDay ? null : { days: 0, minutes: -CALENDAR_GRID_TIME_STEP };
    case "ArrowDown":
      return isAllDay ? null : { days: 0, minutes: CALENDAR_GRID_TIME_STEP };
    default:
      return null;
  }
};

export const isTimedEventInsideOneDay = (start: Dayjs, end: Dayjs) => {
  const midnightAfterStart = start.add(1, "day").startOf("day");

  return end.isSame(start, "day") || end.isSame(midnightAfterStart);
};

export const nudgeEventDates = (
  event: Pick<Schema_Event, "startDate" | "endDate" | "isAllDay">,
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
