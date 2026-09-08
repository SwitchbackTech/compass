import {
  type LocalTimeOfDay,
  localTimeToMinutes,
  type WeeklyAvailability,
  type WeeklyAvailabilityInterval,
} from "@core/types/booking.contracts";
import {
  ISO_WEEKDAYS,
  type IsoWeekday,
  weekdayLabel,
  weekdayShortLabel,
} from "@web/booking/booking.util";

export interface HoursRow {
  weekdays: ReadonlySet<IsoWeekday>;
  start: LocalTimeOfDay;
  end: LocalTimeOfDay;
}

const LAST_TIME: LocalTimeOfDay = "23:45";

const padTime = (minutes: number): LocalTimeOfDay => {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(remainder).padStart(2, "0")}` as LocalTimeOfDay;
};

const TIME_VALUES: LocalTimeOfDay[] = [];
for (let minutes = 0; minutes <= localTimeToMinutes(LAST_TIME); minutes += 15) {
  TIME_VALUES.push(padTime(minutes));
}

export const TIME_OPTIONS: readonly LocalTimeOfDay[] = TIME_VALUES;

export const DEFAULT_HOURS_ROW: HoursRow = {
  weekdays: new Set<IsoWeekday>([1, 2, 3, 4, 5]),
  start: "09:00",
  end: "17:00",
};

const intervalsForDay = (
  value: WeeklyAvailability,
  weekday: IsoWeekday,
): WeeklyAvailabilityInterval[] =>
  value
    .filter((entry) => entry.weekday === weekday)
    .slice()
    .sort((a, b) => a.start.localeCompare(b.start));

/** Group stored intervals into rows that share the first interval's times. */
export function rowsFromAvailability(value: WeeklyAvailability): HoursRow[] {
  const groups = new Map<string, Set<IsoWeekday>>();
  const order: string[] = [];

  for (const weekday of ISO_WEEKDAYS) {
    const first = intervalsForDay(value, weekday)[0];
    if (first == null) continue;
    const key = `${first.start}|${first.end}`;
    const existing = groups.get(key);
    if (existing) {
      existing.add(weekday);
      continue;
    }
    groups.set(key, new Set([weekday]));
    order.push(key);
  }

  return order.map((key) => {
    const [start, end] = key.split("|") as [LocalTimeOfDay, LocalTimeOfDay];
    return {
      weekdays: groups.get(key) ?? new Set<IsoWeekday>(),
      start,
      end,
    };
  });
}

export function availabilityFromRows(
  rows: readonly HoursRow[],
): WeeklyAvailability {
  const claimed = new Set<IsoWeekday>();
  const intervals: WeeklyAvailabilityInterval[] = [];

  for (const row of rows) {
    if (row.weekdays.size === 0) continue;
    for (const weekday of ISO_WEEKDAYS) {
      if (!row.weekdays.has(weekday) || claimed.has(weekday)) continue;
      claimed.add(weekday);
      intervals.push({
        weekday,
        start: row.start,
        end: row.end,
      });
    }
  }

  intervals.sort(
    (left, right) =>
      left.weekday - right.weekday || left.start.localeCompare(right.start),
  );
  return intervals;
}

/** Toggle `weekday` on `rowIndex`, removing it from every other row. */
export function claimWeekday<T extends HoursRow>(
  rows: readonly T[],
  rowIndex: number,
  weekday: IsoWeekday,
): T[] {
  const next = rows.map((row, index) => {
    const weekdays = new Set(row.weekdays);
    if (index === rowIndex) {
      if (weekdays.has(weekday)) weekdays.delete(weekday);
      else weekdays.add(weekday);
    } else {
      weekdays.delete(weekday);
    }
    return { ...row, weekdays };
  });
  if (next.length <= 1) return next;
  return next.filter((row) => row.weekdays.size > 0);
}

export function formatTimeLabel(time: LocalTimeOfDay): string {
  const [hoursText, minutes] = time.split(":");
  const hours = Number(hoursText);
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${minutes} ${suffix}`;
}

export function endOptionsAfter(
  start: LocalTimeOfDay,
): readonly LocalTimeOfDay[] {
  const startMinutes = localTimeToMinutes(start);
  return TIME_OPTIONS.filter((time) => localTimeToMinutes(time) > startMinutes);
}

/** When Start moves past End, End becomes Start plus one hour, capped at 23:45. */
export function snapEndAfterStart(
  start: LocalTimeOfDay,
  end: LocalTimeOfDay,
): LocalTimeOfDay {
  if (localTimeToMinutes(end) > localTimeToMinutes(start)) return end;
  const snapped = padTime(
    Math.min(localTimeToMinutes(start) + 60, localTimeToMinutes(LAST_TIME)),
  );
  return snapped;
}

export function hoursSelectLabel(kind: "Start" | "End", row: HoursRow): string {
  const names = ISO_WEEKDAYS.filter((weekday) => row.weekdays.has(weekday)).map(
    weekdayLabel,
  );
  return names.length > 0 ? `${kind} for ${names.join(", ")}` : kind;
}

export function summarizeHoursRows(rows: readonly HoursRow[]): string {
  return rows
    .filter((row) => row.weekdays.size > 0)
    .map((row) => {
      const days = ISO_WEEKDAYS.filter((weekday) => row.weekdays.has(weekday));
      const dayPart = summarizeWeekdays(days);
      return `${dayPart}, ${formatTimeLabel(row.start)} to ${formatTimeLabel(row.end)}`;
    })
    .join("; ");
}

const summarizeWeekdays = (days: readonly IsoWeekday[]): string => {
  if (days.length >= 2 && isConsecutive(days)) {
    return `${weekdayShortLabel(days[0]!)} to ${weekdayShortLabel(days[days.length - 1]!)}`;
  }
  return days.map(weekdayShortLabel).join(", ");
};

const isConsecutive = (days: readonly IsoWeekday[]): boolean => {
  for (let index = 1; index < days.length; index += 1) {
    if (days[index] !== days[index - 1]! + 1) return false;
  }
  return true;
};

export function unassignedWeekdays(rows: readonly HoursRow[]): IsoWeekday[] {
  const assigned = new Set<IsoWeekday>();
  for (const row of rows) {
    for (const weekday of row.weekdays) assigned.add(weekday);
  }
  return ISO_WEEKDAYS.filter((weekday) => !assigned.has(weekday));
}
