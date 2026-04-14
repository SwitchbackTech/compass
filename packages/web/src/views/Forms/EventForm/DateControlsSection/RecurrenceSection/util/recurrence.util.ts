import { type Weekday } from "rrule";
import {
  WEEKDAY_RRULE_MAP,
  type WEEKDAYS,
} from "../constants/recurrence.constants";

function toWeekDay(weekDay: (typeof WEEKDAYS)[0]): Weekday {
  return WEEKDAY_RRULE_MAP[weekDay];
}

export function toWeekDays(weekDays: typeof WEEKDAYS): Weekday[] {
  return weekDays.map(toWeekDay);
}
