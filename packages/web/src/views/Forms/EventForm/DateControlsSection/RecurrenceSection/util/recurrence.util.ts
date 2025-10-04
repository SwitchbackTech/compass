import { Weekday } from "rrule";
import { Dayjs } from "@core/util/date/dayjs";
import { WEEKDAYS, WEEKDAY_RRULE_MAP } from "./recurrence.constants";

export const getDefaultWeekDay = (startDate: Dayjs): (typeof WEEKDAYS)[0] => {
  const dayOfWeek = startDate.format("dddd").toLowerCase();
  const day = WEEKDAYS.find((day) => dayOfWeek === day);

  if (!day) {
    console.error(
      "No default week day found. Something went wrong. Please investigate",
    );

    return "sunday";
  }

  return day;
};

export function toWeekDay(weekDay: (typeof WEEKDAYS)[0]): Weekday {
  return WEEKDAY_RRULE_MAP[weekDay];
}

export function toWeekDays(weekDays: typeof WEEKDAYS): Weekday[] {
  return weekDays.map(toWeekDay);
}
