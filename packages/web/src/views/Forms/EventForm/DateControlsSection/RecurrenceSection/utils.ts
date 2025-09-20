import { ObjectId } from "bson";
import { Dayjs } from "dayjs";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Frequency, Options, RRule, Weekday } from "rrule";
import { Schema_Event } from "@core/types/event.types";
import { CompassEventRRule } from "@core/util/event/compass.event.rrule";
import { parseCompassEventDate } from "@core/util/event/event.util";

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

export const useRecurrence = (
  event: Schema_Event,
  { setEvent }: { setEvent: Dispatch<SetStateAction<Schema_Event | null>> },
) => {
  const _startDate = parseCompassEventDate(event.startDate!);
  const { _id, startDate, endDate, recurrence } = event;
  const hasRecurrence = (event.recurrence?.rule?.length ?? 0) > 0;

  const { options } = useMemo(() => {
    if (!hasRecurrence) {
      return {
        options: {
          freq: Frequency.DAILY,
          interval: 1,
          byweekday: undefined,
          wkst: WEEKDAY_MAP[0].weekday,
          count: null,
          until: null,
          dtstart: _startDate.toDate(),
        },
      };
    }

    return new CompassEventRRule({
      _id: new ObjectId(_id),
      startDate: startDate!,
      endDate: endDate!,
      recurrence: { rule: recurrence?.rule as string[] },
    });
  }, [_id, _startDate, startDate, endDate, hasRecurrence, recurrence?.rule]);

  const defaultWeekDay: typeof WEEKDAYS = useMemo(
    () =>
      options?.byweekday?.map(
        (day) => REVERSE_WEEKDAY_LABELS_MAP[WEEKDAY_MAP[day].toString()],
      ) ?? [],
    [options?.byweekday],
  );

  const defaultWkst = useMemo<Weekday | null>(
    () => (options?.wkst ? WEEKDAY_MAP[options.wkst] : null),
    [options?.wkst],
  );

  const [freq, setFreq] = useState<Frequency>(options.freq);
  const [interval, setInterval] = useState<number>(options.interval);
  const [until, setUntil] = useState<Date | null>(options.until);
  const [count, setCount] = useState<number | null>(options.count);
  const [wkst, setWkst] = useState<Weekday | null>(defaultWkst);
  const [weekDays, setWeekDays] = useState<typeof WEEKDAYS>(defaultWeekDay);
  const byweekday = useMemo<Weekday[]>(() => toWeekDays(weekDays), [weekDays]);
  const dtstart = useMemo<Date>(() => _startDate.toDate(), [_startDate]);

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
    () =>
      new CompassEventRRule(
        {
          _id: new ObjectId(_id),
          startDate: startDate!,
          endDate: endDate!,
          recurrence: { rule: [] },
        },
        rruleOptions,
      ),
    [_id, startDate, endDate, rruleOptions],
  );

  const rule = useMemo(() => JSON.stringify(rrule.toRecurrence()), [rrule]);

  const toggleRecurrence = useCallback(() => {
    setEvent((gridEvent): Schema_Event | null => {
      if (!gridEvent) return gridEvent;

      const { recurrence, ...event } = gridEvent;
      const { eventId, rule: _rule } = recurrence ?? {};

      if (_rule) {
        return {
          ...event,
          recurrence: {
            ...(eventId ? { eventId } : {}),
            rule: null as unknown as string[],
          },
        };
      }

      return {
        ...event,
        recurrence: { ...(recurrence ?? {}), rule: JSON.parse(rule) },
      };
    });
  }, [setEvent, rule]);

  useEffect(() => {
    if (!hasRecurrence) return;

    setEvent((gridEvent): Schema_Event | null => {
      if (!gridEvent) return gridEvent;

      return {
        ...gridEvent,
        recurrence: { ...(gridEvent.recurrence ?? {}), rule: JSON.parse(rule) },
      };
    });
  }, [rule, hasRecurrence, setEvent]);

  return {
    hasRecurrence,
    ...rrule.options,
    weekDays,
    setFreq,
    setInterval,
    setUntil,
    setCount,
    setWkst,
    setWeekDays,
    toggleRecurrence,
  };
};
