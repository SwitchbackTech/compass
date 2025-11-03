import { ObjectId } from "bson";
import dayjs from "dayjs";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Frequency, Options, RRule, Weekday } from "rrule";
import { CompassEventRRule } from "@core/util/event/compass.event.rrule";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import {
  FrequencyValues,
  WEEKDAYS,
  WEEKDAY_RRULE_MAP,
} from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/constants/recurrence.constants";
import { toWeekDays } from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/util/recurrence.util";
import { Schema_Event } from "../../../../../../../../core/src/types/event.types";

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

export const useRecurrence = (
  event: Partial<
    Pick<
      Schema_GridEvent | Schema_Event,
      "startDate" | "endDate" | "recurrence" | "isSomeday"
    >
  > | null,
  {
    setEvent,
  }: {
    setEvent: Dispatch<SetStateAction<Schema_GridEvent | Schema_Event | null>>;
  },
) => {
  const { recurrence, isSomeday } = event ?? {};
  const startDate = event?.startDate ?? dayjs().toDate();
  const endDate = event?.endDate ?? dayjs().add(1, "hour").toDate();
  const hasRecurrence = (event?.recurrence?.rule?.length ?? 0) > 0;

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
      _id: new ObjectId(), // we do not need the event's actual id here
      startDate: startDate!,
      endDate: endDate!,
      recurrence: { rule: recurrence?.rule as string[] },
    });
  }, [_startDate, startDate, endDate, hasRecurrence, recurrence?.rule]);

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
          _id: new ObjectId(), // we do not need the event's actual id here
          startDate: startDate,
          endDate: endDate,
          recurrence: { rule: [] },
        },
        { ...rruleOptions, count: isSomeday ? 6 : rruleOptions.count }, // default to 6 occurrences for someday events
      ),
    [startDate, endDate, rruleOptions, isSomeday],
  );

  const rule = useMemo(() => JSON.stringify(rrule.toRecurrence()), [rrule]);

  const toggleRecurrence = useCallback(() => {
    setEvent((gridEvent): Schema_GridEvent | Schema_Event | null => {
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

    setEvent((gridEvent): Schema_GridEvent | Schema_Event | null => {
      if (!gridEvent) return gridEvent;

      return {
        ...gridEvent,
        recurrence: { ...(gridEvent.recurrence ?? {}), rule: JSON.parse(rule) },
      };
    });
  }, [rule, hasRecurrence, setEvent]);

  return {
    hasRecurrence,
    weekDays,
    interval: rrule.options.interval,
    freq: rrule.options.freq as FrequencyValues,
    until: rrule.options.until,
    setFreq,
    setInterval,
    setUntil,
    setCount,
    setWkst,
    setWeekDays,
    toggleRecurrence,
  };
};
