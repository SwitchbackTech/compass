import { Weekday } from "rrule";
import { WEEKDAYS, WEEKDAY_RRULE_MAP } from "../constants/recurrence.constants";

function toWeekDay(weekDay: (typeof WEEKDAYS)[0]): Weekday {
  return WEEKDAY_RRULE_MAP[weekDay];
}

export function toWeekDays(weekDays: typeof WEEKDAYS): Weekday[] {
  return weekDays.map(toWeekDay);
}
