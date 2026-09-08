import {
  type WeeklyAvailability,
  type WeeklyAvailabilityInterval,
} from "@core/types/booking.contracts";
import {
  ISO_WEEKDAYS,
  type IsoWeekday,
  weekdayLabel,
} from "@web/booking/booking.util";
import {
  formatHoursRanges,
  parseHoursRanges,
} from "@web/booking/weekly-hours.parse";

export interface HoursRow {
  weekdays: ReadonlySet<IsoWeekday>;
  text: string;
}

export type RowsResult =
  | { ok: true; value: WeeklyAvailability }
  | { ok: false; errors: ReadonlyMap<number, string> };

const intervalsForDay = (
  value: WeeklyAvailability,
  weekday: IsoWeekday,
): WeeklyAvailabilityInterval[] =>
  value
    .filter((entry) => entry.weekday === weekday)
    .slice()
    .sort((a, b) => a.start.localeCompare(b.start));

/** Group stored intervals into rows that share the same formatted hours text. */
export function rowsFromAvailability(value: WeeklyAvailability): HoursRow[] {
  const groups = new Map<string, Set<IsoWeekday>>();
  const order: string[] = [];

  for (const weekday of ISO_WEEKDAYS) {
    const text = formatHoursRanges(intervalsForDay(value, weekday));
    if (text === "") continue;
    const existing = groups.get(text);
    if (existing) {
      existing.add(weekday);
      continue;
    }
    groups.set(text, new Set([weekday]));
    order.push(text);
  }

  return order.map((text) => ({
    weekdays: groups.get(text) ?? new Set<IsoWeekday>(),
    text,
  }));
}

export function availabilityFromRows(rows: readonly HoursRow[]): RowsResult {
  const errors = new Map<number, string>();
  const claimed = new Set<IsoWeekday>();
  const intervals: WeeklyAvailabilityInterval[] = [];

  rows.forEach((row, index) => {
    const hasDays = row.weekdays.size > 0;
    const trimmed = row.text.trim();
    if (!hasDays && trimmed === "") return;
    if (!hasDays) {
      errors.set(index, "Choose at least one day.");
      return;
    }

    const parsed = parseHoursRanges(row.text);
    if (!parsed.ok) {
      errors.set(index, parsed.error);
      return;
    }

    for (const weekday of ISO_WEEKDAYS) {
      if (!row.weekdays.has(weekday) || claimed.has(weekday)) continue;
      claimed.add(weekday);
      for (const range of parsed.ranges) {
        intervals.push({
          weekday,
          start: range.start,
          end: range.end,
        });
      }
    }
  });

  if (errors.size > 0) return { ok: false, errors };
  intervals.sort(
    (left, right) =>
      left.weekday - right.weekday || left.start.localeCompare(right.start),
  );
  return { ok: true, value: intervals };
}

/** Toggle `weekday` on `rowIndex`, removing it from every other row. */
export function claimWeekday(
  rows: readonly HoursRow[],
  rowIndex: number,
  weekday: IsoWeekday,
): HoursRow[] {
  return rows.map((row, index) => {
    const weekdays = new Set(row.weekdays);
    if (index === rowIndex) {
      if (weekdays.has(weekday)) weekdays.delete(weekday);
      else weekdays.add(weekday);
    } else {
      weekdays.delete(weekday);
    }
    return { weekdays, text: row.text };
  });
}

/** Formatted hours for the row's first weekday, or blank when it has none. */
export function textForRow(value: WeeklyAvailability, row: HoursRow): string {
  const first = ISO_WEEKDAYS.find((weekday) => row.weekdays.has(weekday));
  if (first == null) return "";
  return formatHoursRanges(intervalsForDay(value, first));
}

export function hoursInputLabel(row: HoursRow): string {
  const names = ISO_WEEKDAYS.filter((weekday) => row.weekdays.has(weekday)).map(
    weekdayLabel,
  );
  return names.length > 0 ? `Hours for ${names.join(", ")}` : "Hours";
}

export function unassignedWeekdays(rows: readonly HoursRow[]): IsoWeekday[] {
  const assigned = new Set<IsoWeekday>();
  for (const row of rows) {
    for (const weekday of row.weekdays) assigned.add(weekday);
  }
  return ISO_WEEKDAYS.filter((weekday) => !assigned.has(weekday));
}
