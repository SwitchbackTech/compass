import dayjs, { Dayjs } from "dayjs";
import { useMemo, useState } from "react";
import { Frequency, Options, RRule, Weekday } from "rrule";
import { Schema_Event, Schema_Event_Recur_Base } from "@core/types/event.types";
import { CompassEventRRule } from "@core/util/event/compass.event.rrule";
import { getCompassEventDateFormat } from "@core/util/event/event.util";

export const WEEKDAYS: Array<keyof typeof WEEKDAY_RRULE_MAP> = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export const FREQUENCY_MAP: Record<Frequency, string> = {
  [Frequency.SECONDLY]: "Second",
  [Frequency.MINUTELY]: "Minute",
  [Frequency.HOURLY]: "Hour",
  [Frequency.DAILY]: "Day",
  [Frequency.WEEKLY]: "Week",
  [Frequency.MONTHLY]: "Month",
  [Frequency.YEARLY]: "Year",
};

export const FREQUENCY_OPTIONS = (suffix = "") =>
  Object.entries(FREQUENCY_MAP).map(([value, label]) => ({
    label: `${label}${suffix}`,
    value: value as unknown as Frequency,
  }));

const WEEKDAY_RRULE_MAP = {
  monday: RRule.MO,
  tuesday: RRule.TU,
  wednesday: RRule.WE,
  thursday: RRule.TH,
  friday: RRule.FR,
  saturday: RRule.SA,
  sunday: RRule.SU,
};

const WEEKDAY_LABELS_MAP: Record<keyof typeof WEEKDAY_RRULE_MAP, string> = {
  sunday: RRule.SU.toString(),
  monday: RRule.MO.toString(),
  tuesday: RRule.TU.toString(),
  wednesday: RRule.WE.toString(),
  thursday: RRule.TH.toString(),
  friday: RRule.FR.toString(),
  saturday: RRule.SA.toString(),
};

const REVERSE_WEEKDAY_LABELS_MAP: Record<
  string,
  keyof typeof WEEKDAY_RRULE_MAP
> = Object.entries(WEEKDAY_LABELS_MAP).reduce(
  (acc, [key, value]) => ({ ...acc, [value]: key }),
  {},
);

const WEEKDAY_MAP: Record<
  number | string | keyof typeof WEEKDAY_RRULE_MAP,
  Weekday
> = [
  RRule.SU,
  RRule.MO,
  RRule.TU,
  RRule.WE,
  RRule.TH,
  RRule.FR,
  RRule.SA,
].reduce(
  (acc, day) => ({
    ...acc,
    [day.weekday]: day,
    [day.toString()]: day,
    [REVERSE_WEEKDAY_LABELS_MAP[day.toString()]]: day,
  }),
  {},
);

export const getDefaultWeekDay = (startDate: Dayjs): (typeof WEEKDAYS)[0] => {
  const dayOfWeek = startDate.format("dddd").toLowerCase();
  const day = WEEKDAYS.find((day) => dayOfWeek === day);

  if (!day) {
    console.log(
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

export const useRecurrence = (event: Schema_Event) => {
  const dateFormat = getCompassEventDateFormat(event.startDate!);
  const startDate = dayjs(event.startDate, dateFormat);

  const { options } = useMemo(
    () => new CompassEventRRule(event as Schema_Event_Recur_Base),
    [event],
  );

  const defaultWeekDay: typeof WEEKDAYS = useMemo(
    () =>
      options.byweekday?.map(
        (day) => REVERSE_WEEKDAY_LABELS_MAP[WEEKDAY_MAP[day].toString()],
      ) ?? [],
    [options.byweekday],
  );

  const defaultWkst = useMemo<Weekday | null>(
    () => (options.wkst ? WEEKDAY_MAP[options.wkst] : null),
    [options.wkst],
  );

  const [freq, setFreq] = useState<Frequency>(options.freq);
  const [interval, setInterval] = useState<number>(options.interval);
  const [until, setUntil] = useState<Date | null>(options.until);
  const [count, setCount] = useState<number | null>(options.count);
  const [wkst, setWkst] = useState<Weekday | null>(defaultWkst);
  const [weekDays, setWeekDays] = useState<typeof WEEKDAYS>(defaultWeekDay);
  const byweekday = useMemo<Weekday[]>(() => toWeekDays(weekDays), [weekDays]);
  const dtstart = useMemo<Date>(() => startDate.toDate(), [startDate]);

  const rruleOptions = useMemo<Partial<Options>>(
    () => ({
      freq,
      dtstart,
      interval,
      wkst,
      byweekday,
      until,
      count,
    }),
    [freq, dtstart, interval, wkst, byweekday, until, count],
  );

  const rrule = useMemo(
    () => new CompassEventRRule(event as Schema_Event_Recur_Base, rruleOptions),
    [event, rruleOptions],
  );

  return {
    rrule,
    options: rruleOptions,
    weekDays,
    setFreq,
    setInterval,
    setUntil,
    setCount,
    setWkst,
    setWeekDays,
  };
};
