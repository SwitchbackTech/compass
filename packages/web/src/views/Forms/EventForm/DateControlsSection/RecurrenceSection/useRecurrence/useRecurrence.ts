import { ObjectId } from "bson";
import fastDeepEqual from "fast-deep-equal/react";
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Frequency, type Options, RRule, type Weekday } from "rrule";
import { type CompassEvent } from "@core/types/compass-event.contracts";
import dayjs from "@core/util/date/dayjs";
import { CompassEventRRule } from "@core/util/event/compass.event.rrule";
import { parseCompassEventDate } from "@core/util/event/event.util";
import {
  type FrequencyValues,
  WEEKDAY_RRULE_MAP,
  type WEEKDAYS,
} from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/constants/recurrence.constants";

const WEEKDAY_LABELS_MAP: Record<keyof typeof WEEKDAY_RRULE_MAP, string> = {
  sunday: RRule.SU.toString(),
  monday: RRule.MO.toString(),
  tuesday: RRule.TU.toString(),
  wednesday: RRule.WE.toString(),
  thursday: RRule.TH.toString(),
  friday: RRule.FR.toString(),
  saturday: RRule.SA.toString(),
};
const REVERSE_WEEKDAY_LABELS_MAP = Object.fromEntries(
  Object.entries(WEEKDAY_LABELS_MAP).map(([key, value]) => [value, key]),
) as Record<string, keyof typeof WEEKDAY_RRULE_MAP>;

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
  (acc, day) => {
    acc[day.weekday] = day;
    acc[day.toString()] = day;
    acc[REVERSE_WEEKDAY_LABELS_MAP[day.toString()]] = day;
    return acc;
  },
  {} as Record<number | string | keyof typeof WEEKDAY_RRULE_MAP, Weekday>,
);

const normalizeRecurrenceRule = (rule: string[] | null | undefined): string[] =>
  (rule ?? []).map((entry) => entry.replace(/;WKST=[A-Z]{2}/, ""));

const weekdayKeyFromByweekday = (
  day: number | Weekday,
): keyof typeof WEEKDAY_RRULE_MAP => {
  const weekday = typeof day === "number" ? day : day.weekday;
  return REVERSE_WEEKDAY_LABELS_MAP[WEEKDAY_MAP[weekday].toString()];
};

export const useRecurrence = (
  event: Partial<
    Pick<CompassEvent, "startDate" | "endDate" | "recurrence">
  > | null,
  {
    setEvent,
  }: {
    setEvent: Dispatch<SetStateAction<CompassEvent | null>>;
  },
) => {
  const { recurrence, endDate: _endDate } = event ?? {};
  // `||`, not `??`: an undated draft-in-progress can carry `startDate: ""`
  // (not yet assigned a real date), which `??` wouldn't catch and
  // `parseCompassEventDate` throws on below.
  const startDate = event?.startDate || dayjs().toRFC3339OffsetString();
  const endDate = _endDate || dayjs().add(1, "hour").toRFC3339OffsetString();
  const _startDate = parseCompassEventDate(startDate);
  const hasRecurrence = (event?.recurrence?.rule?.length ?? 0) > 0;
  const currentRule = event?.recurrence?.rule;

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
      startDate: startDate,
      endDate: endDate,
      recurrence: { rule: recurrence?.rule as string[] },
    });
  }, [_startDate, startDate, endDate, hasRecurrence, recurrence?.rule]);

  const defaultWeekDay: typeof WEEKDAYS = useMemo(
    () =>
      options?.byweekday?.map((day) => weekdayKeyFromByweekday(day)) ?? [],
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
  const byweekday = useMemo(
    () => weekDays.map((day) => WEEKDAY_RRULE_MAP[day].weekday),
    [weekDays],
  );
  const dtstart = useMemo<Date>(() => _startDate.toDate(), [_startDate]);

  const rruleOptions = useMemo<Partial<Options>>(
    () => ({
      freq,
      dtstart,
      interval,
      wkst: wkst?.weekday ?? undefined,
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
        rruleOptions,
      ),
    [startDate, endDate, rruleOptions],
  );

  const rule = useMemo(() => JSON.stringify(rrule.toRecurrence()), [rrule]);

  const toggleRecurrence = useCallback(() => {
    setEvent((gridEvent): CompassEvent | null => {
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

    const nextRule = JSON.parse(rule);
    if (fastDeepEqual(normalizeRecurrenceRule(currentRule), normalizeRecurrenceRule(nextRule))) {
      return;
    }

    setEvent((gridEvent): CompassEvent | null => {
      if (!gridEvent) return gridEvent;

      if (fastDeepEqual(gridEvent.recurrence?.rule, nextRule)) {
        return gridEvent;
      }

      return {
        ...gridEvent,
        recurrence: { ...(gridEvent.recurrence ?? {}), rule: nextRule },
      };
    });
  }, [currentRule, rule, hasRecurrence, setEvent]);

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
