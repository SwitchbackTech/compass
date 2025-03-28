import dayjs from "dayjs";
import { RRule } from "rrule";
import { Schema_Event } from "@core/types/event.types";
import { devAlert } from "@core/util/app.util";

export const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const WEEKDAY_RRULE_MAP = {
  monday: RRule.MO,
  tuesday: RRule.TU,
  wednesday: RRule.WE,
  thursday: RRule.TH,
  friday: RRule.FR,
  saturday: RRule.SA,
  sunday: RRule.SU,
};

interface GenerateRecurrenceParams {
  event: Schema_Event;
  repeatCount: number;
  weekDays: string[];
}

export const generateRecurrenceDates = ({
  event,
  repeatCount,
  weekDays,
}: GenerateRecurrenceParams) => {
  if (weekDays.length === 0) {
    return [];
  }

  const startDate = dayjs(event.startDate);
  const endDate = dayjs(event.endDate);
  const duration = endDate.diff(startDate);

  const byWeekDay = weekDays.map(
    (day) => WEEKDAY_RRULE_MAP[day as keyof typeof WEEKDAY_RRULE_MAP],
  );

  const untilDate = startDate.add(repeatCount - 1, "weeks").endOf("week");

  const rule = new RRule({
    freq: RRule.WEEKLY,
    dtstart: startDate.toDate(),
    until: untilDate.toDate(),
    byweekday: byWeekDay,
  });

  const occurrences = rule.all().map((date) => ({
    startDate: dayjs(date).format(),
    endDate: dayjs(date).add(duration, "millisecond").format(),
  }));

  return occurrences;
};

export const getDefaultWeekDay = (event: Schema_Event): string => {
  const day = WEEKDAYS.find((day) => {
    const dayOfWeek = dayjs(event.startDate).format("dddd").toLowerCase();
    return dayOfWeek === day;
  });
  if (!day) {
    devAlert(
      "No default week day found. Something went wrong. Please investigate",
    );
    return "";
  }

  return day;
};
