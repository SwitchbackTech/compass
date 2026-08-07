import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { type Dayjs } from "@core/util/date/dayjs";
import { type GridEvent } from "@web/common/types/web.event.types";

/**
 * Whether an all-day (or all-day-row) event's exclusive date span covers
 * `date`. Uses calendar-date prefixes so Sync UTC-midnight datetime shapes
 * and date-only schedules agree with {@link eventMatchesRange} / week
 * {@link isAllDayEventInVisibleDays}.
 */
export const isAllDayEventOnDay = (
  event: Pick<GridEvent, "startDate" | "endDate">,
  date: Dayjs,
): boolean => {
  const dayStart = date.startOf("day").format(YEAR_MONTH_DAY_FORMAT);
  const dayEnd = date
    .startOf("day")
    .add(1, "day")
    .format(YEAR_MONTH_DAY_FORMAT);
  const eventStart = event.startDate.slice(0, 10);
  const eventEnd = event.endDate.slice(0, 10);
  return eventStart < dayEnd && eventEnd > dayStart;
};

/**
 * Day view columns are calendars on the same date. Week-style row assignment
 * treats every same-day event as overlapping, so N calendars' all-day events
 * stack into N vertical rows. Assign rows per calendar column instead so
 * events in different columns can share a row and the all-day strip stays short.
 *
 * Within a column every displayed all-day event covers the same day, so they
 * always overlap — stacking in input order is enough (no day-span packing).
 * Rows are keyed by encounter order (not `_id`) so untitled drafts without an
 * id still keep their stacked row.
 */
export const assignDayAllDayEventRows = (
  events: GridEvent[],
  getColumnIndex: (event: GridEvent) => number,
): { allDayEvents: GridEvent[]; rowsCount: number } => {
  if (events.length === 0) {
    return { allDayEvents: events, rowsCount: 1 };
  }

  const nextRowByColumn = new Map<number, number>();
  let rowsCount = 1;

  const allDayEvents = events.map((event) => {
    const columnIndex = getColumnIndex(event);
    const row = nextRowByColumn.get(columnIndex) ?? 1;
    nextRowByColumn.set(columnIndex, row + 1);
    rowsCount = Math.max(rowsCount, row);

    return { ...event, row };
  });

  return { allDayEvents, rowsCount };
};
