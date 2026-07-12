import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import {
  CALENDAR_DRAFT_PADDING_BOTTOM,
  CALENDAR_EVENT_ALLDAY_HEIGHT,
  CALENDAR_EVENT_ALLDAY_ROW_HEIGHT,
  CALENDAR_EVENT_PADDING_RIGHT,
  CALENDAR_GRID_MARGIN_LEFT,
  CALENDAR_TIMED_EVENT_COLUMN_INSET,
} from "@web/layout/calendar-grid/calendarGrid.constants";
import {
  type CalendarEventPosition,
  type CalendarGridMeasurements,
  type CalendarGridVisibleDate,
} from "@web/layout/calendar-grid/types/calendarGrid.types";

export interface CalendarEventPositionInput {
  isDraft: boolean;
  measurements: CalendarGridMeasurements;
  visibleDates: CalendarGridVisibleDate[];
}

export const getCalendarTimedEventPosition = (
  event: Schema_GridEvent,
  input: CalendarEventPositionInput,
): CalendarEventPosition => {
  const start = dayjs(event.startDate);
  const end = dayjs(event.endDate);
  const dateIndex = getVisibleDateIndex(start, input.visibleDates);
  if (dateIndex === null) {
    return zeroPosition();
  }

  const columnLeft = sumWidthsBefore(input.measurements.colWidths, dateIndex);
  const columnWidth = input.measurements.colWidths[dateIndex] ?? 0;
  const minutesFromStartOfDay = start.diff(start.startOf("day"), "minute");
  const durationMinutes = Math.max(15, end.diff(start, "minute"));
  const widthMultiplier = input.isDraft
    ? 1
    : (event.position?.widthMultiplier ?? 1);

  return {
    height:
      (durationMinutes / 60) * input.measurements.hourHeight -
      CALENDAR_DRAFT_PADDING_BOTTOM,
    left:
      CALENDAR_GRID_MARGIN_LEFT +
      columnLeft +
      CALENDAR_TIMED_EVENT_COLUMN_INSET,
    top: (minutesFromStartOfDay / 60) * input.measurements.hourHeight,
    width: Math.max(
      0,
      columnWidth * widthMultiplier - CALENDAR_TIMED_EVENT_COLUMN_INSET * 2,
    ),
  };
};

export interface CalendarBusyPeriodPositionInput {
  measurements: CalendarGridMeasurements;
  visibleDates: CalendarGridVisibleDate[];
}

/**
 * Positions an already day-clamped {start, end} segment, reusing the same
 * column/hour math as {@link getCalendarTimedEventPosition} (left/width from
 * colWidths, top/height from minutes-of-day) minus its widthMultiplier/deck
 * concerns - busy blocks never overlap-fan like event cards, they just
 * render at full column width. Callers (MainGridBusyPeriods /
 * DayCalendarBusyPeriods) clamp a possibly multi-day BusyPeriod to one day's
 * [00:00, 24:00) window per call via splitBusyPeriodsByDay before reaching
 * here, so `segment.start`/`segment.end` are always within a single day
 * (packet 08 phase 4; A7). A full-day busy range still renders as one tall
 * timed block per day rather than in the all-day row - acceptable for v1.
 */
export const getCalendarBusyPeriodPosition = (
  segment: { start: string; end: string },
  input: CalendarBusyPeriodPositionInput,
): CalendarEventPosition => {
  const start = dayjs(segment.start);
  const end = dayjs(segment.end);
  const dateIndex = getVisibleDateIndex(start, input.visibleDates);
  if (dateIndex === null) {
    return zeroPosition();
  }

  const columnLeft = sumWidthsBefore(input.measurements.colWidths, dateIndex);
  const columnWidth = input.measurements.colWidths[dateIndex] ?? 0;
  const minutesFromStartOfDay = start.diff(start.startOf("day"), "minute");
  const durationMinutes = Math.max(1, end.diff(start, "minute"));

  return {
    height: (durationMinutes / 60) * input.measurements.hourHeight,
    left:
      CALENDAR_GRID_MARGIN_LEFT +
      columnLeft +
      CALENDAR_TIMED_EVENT_COLUMN_INSET,
    top: (minutesFromStartOfDay / 60) * input.measurements.hourHeight,
    width: Math.max(0, columnWidth - CALENDAR_TIMED_EVENT_COLUMN_INSET * 2),
  };
};

export const getCalendarAllDayEventPosition = (
  event: Schema_GridEvent,
  input: CalendarEventPositionInput,
): CalendarEventPosition => {
  const span = getVisibleAllDaySpan(event, input.visibleDates);
  if (!span) {
    return zeroPosition();
  }

  const startIndex = getVisibleDateIndex(span.start, input.visibleDates);
  const endIndex = getVisibleDateIndex(span.end, input.visibleDates);
  if (startIndex === null || endIndex === null) {
    return zeroPosition();
  }

  const left = sumWidthsBefore(input.measurements.colWidths, startIndex);
  const width = widthMinusPadding(
    sumWidthsBetween(input.measurements.colWidths, startIndex, endIndex),
  );

  return {
    height: CALENDAR_EVENT_ALLDAY_HEIGHT,
    left,
    top: CALENDAR_EVENT_ALLDAY_ROW_HEIGHT * (event.row || 1),
    width,
  };
};

const getVisibleAllDaySpan = (
  event: Schema_GridEvent,
  visibleDates: CalendarGridVisibleDate[],
) => {
  const visibleStart = visibleDates[0]?.date.startOf("day");
  if (!visibleStart) {
    return null;
  }

  const visibleEnd =
    visibleDates[visibleDates.length - 1]?.date.startOf("day") ?? visibleStart;
  const eventStart = dayjs(event.startDate).startOf("day");
  const exclusiveEnd = dayjs(event.endDate).startOf("day");
  const eventEnd = exclusiveEnd.isAfter(eventStart)
    ? exclusiveEnd.subtract(1, "day")
    : eventStart;

  if (eventEnd.isBefore(visibleStart) || eventStart.isAfter(visibleEnd)) {
    return null;
  }

  const start = eventStart.isBefore(visibleStart) ? visibleStart : eventStart;
  const end = eventEnd.isAfter(visibleEnd) ? visibleEnd : eventEnd;

  return { end, start };
};

const getVisibleDateIndex = (
  date: Dayjs,
  visibleDates: CalendarGridVisibleDate[],
) => {
  if (visibleDates.length === 0) {
    return null;
  }

  const normalizedDate = date.startOf("day");
  const matchingIndex = visibleDates.findIndex(({ date: visibleDate }) =>
    visibleDate.isSame(normalizedDate, "day"),
  );

  if (matchingIndex !== -1) {
    return matchingIndex;
  }

  return null;
};

const sumWidthsBefore = (widths: number[], dateIndex: number) =>
  widths
    .slice(0, Math.max(0, Math.min(dateIndex, widths.length)))
    .reduce((sum, width) => sum + width, 0);

const sumWidthsBetween = (
  widths: number[],
  startIndex: number,
  endIndex: number,
) => {
  if (endIndex < startIndex) {
    return 0;
  }

  return widths
    .slice(startIndex, endIndex + 1)
    .reduce((sum, width) => sum + width, 0);
};

const widthMinusPadding = (width: number) => {
  const adjustedWidth = width - CALENDAR_EVENT_PADDING_RIGHT;

  return adjustedWidth < 0 ? width : adjustedWidth;
};

const zeroPosition = (): CalendarEventPosition => ({
  height: 0,
  left: 0,
  top: 0,
  width: 0,
});
