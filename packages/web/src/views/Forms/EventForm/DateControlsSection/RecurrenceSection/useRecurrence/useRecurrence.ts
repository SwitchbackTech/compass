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
import dayjs from "@core/util/date/dayjs";
import {
  CompassEventRRule,
  localizeFloatingDate,
} from "@core/util/event/compass.event.rrule";
import { getCompassEventDateFormat } from "@core/util/event/event.util";
import { type GridEventDraft } from "@web/events/event-draft.types";
import {
  patchGridDraftRecurrence,
  resolveDraftRecurrenceRules,
} from "@web/events/grid-event-draft.adapter";
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

const scheduleDatesFromDraft = (draft: GridEventDraft) => {
  const { schedule } = draft.values;

  if (schedule.kind === "allDay") {
    return {
      startDate: dayjs(schedule.start).toYearMonthDayString(),
      endDate: dayjs(schedule.end).toYearMonthDayString(),
    };
  }

  return {
    startDate:
      dayjs(schedule.start).format() || dayjs().toRFC3339OffsetString(),
    endDate:
      dayjs(schedule.end).format() ||
      dayjs().add(1, "hour").toRFC3339OffsetString(),
  };
};

export const useRecurrence = (
  draft: GridEventDraft,
  {
    setDraft,
  }: {
    setDraft: Dispatch<SetStateAction<GridEventDraft | null>>;
  },
  seriesRules?: readonly string[],
) => {
  const currentRules = resolveDraftRecurrenceRules(draft, seriesRules);
  const hasRecurrence = currentRules.length > 0;
  const { startDate, endDate } = scheduleDatesFromDraft(draft);
  const _startDate = dayjs(startDate);

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
      _id: new ObjectId(),
      startDate,
      endDate,
      recurrence: { rule: currentRules },
    });
  }, [_startDate, startDate, endDate, hasRecurrence, currentRules]);

  const defaultWeekDay: typeof WEEKDAYS = useMemo(
    () => options?.byweekday?.map((day) => weekdayKeyFromByweekday(day)) ?? [],
    [options?.byweekday],
  );

  const defaultWkst = useMemo<Weekday | null>(
    // wkst === 0 is RRule.MO (rrule numbers weekdays MO=0..SU=6) - a falsy
    // check here would treat a parsed WKST=MO as "no wkst" and null it out.
    () => (options?.wkst != null ? WEEKDAY_MAP[options.wkst] : null),
    [options?.wkst],
  );

  // `options.until` (off the RRule library's internal, parsed representation)
  // is in the floating frame used for candidate expansion for TIMED events
  // only (see CompassEventRRule#initOptions - all-day UNTILs are never
  // floated). Un-float a timed UNTIL before storing as editable state - the
  // rebuilt `rrule` below feeds `until` back in as `_options.until`, which
  // #initOptions floats again; seeding state with the already-floating value
  // would double-float it every render and drift the persisted UNTIL by the
  // timezone offset each time (never converging - the deep-equal guard in
  // the effect below never passes).
  const isTimed =
    getCompassEventDateFormat(startDate) !==
    dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT;
  const timezone = dayjs.tz.guess();
  const toRealUntil = (floating: Date | null): Date | null =>
    floating && isTimed ? localizeFloatingDate(floating, timezone) : floating;

  const [freq, setFreq] = useState<Frequency>(options.freq);
  const [interval, setInterval] = useState<number>(options.interval);
  const [until, setUntil] = useState<Date | null>(toRealUntil(options.until));
  const [count, setCount] = useState<number | null>(options.count);
  const [wkst, setWkst] = useState<Weekday | null>(defaultWkst);
  const [weekDays, setWeekDays] = useState<typeof WEEKDAYS>(defaultWeekDay);

  const ruleSeedKey = `${hasRecurrence}:${JSON.stringify(normalizeRecurrenceRule(currentRules))}`;
  const [syncedRuleSeedKey, setSyncedRuleSeedKey] = useState(ruleSeedKey);

  if (ruleSeedKey !== syncedRuleSeedKey) {
    setSyncedRuleSeedKey(ruleSeedKey);
    setFreq(options.freq);
    setInterval(options.interval);
    setUntil(toRealUntil(options.until));
    setCount(options.count);
    setWkst(defaultWkst);
    setWeekDays(defaultWeekDay);
  }

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
          _id: new ObjectId(),
          startDate,
          endDate,
          recurrence: { rule: [] },
        },
        rruleOptions,
      ),
    [startDate, endDate, rruleOptions],
  );

  const rule = useMemo(() => JSON.stringify(rrule.toRecurrence()), [rrule]);

  const toggleRecurrence = useCallback(() => {
    setDraft((currentDraft) => {
      if (!currentDraft) return currentDraft;

      const rules = resolveDraftRecurrenceRules(currentDraft, seriesRules);

      if (rules.length > 0) {
        return patchGridDraftRecurrence(currentDraft, [], seriesRules);
      }

      return patchGridDraftRecurrence(
        currentDraft,
        JSON.parse(rule),
        seriesRules,
      );
    });
  }, [setDraft, rule, seriesRules]);

  useEffect(() => {
    if (!hasRecurrence) return;

    const nextRule = JSON.parse(rule);
    if (
      fastDeepEqual(
        normalizeRecurrenceRule(currentRules),
        normalizeRecurrenceRule(nextRule),
      )
    ) {
      return;
    }

    setDraft((currentDraft) => {
      if (!currentDraft) return currentDraft;

      const projectedRules = resolveDraftRecurrenceRules(
        currentDraft,
        seriesRules,
      );
      if (fastDeepEqual(projectedRules, nextRule)) {
        return currentDraft;
      }

      return patchGridDraftRecurrence(currentDraft, nextRule, seriesRules);
    });
  }, [currentRules, hasRecurrence, rule, seriesRules, setDraft]);

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
