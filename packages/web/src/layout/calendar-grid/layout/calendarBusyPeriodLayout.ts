import { type CalendarId } from "@core/types/domain-primitives";
import { type BusyPeriod } from "@core/types/event.contracts";
import dayjs from "@core/util/date/dayjs";
import { type CalendarGridVisibleDate } from "@web/layout/calendar-grid/types/calendarGrid.types";

export interface CalendarBusyPeriodDaySegment {
  calendarId: CalendarId;
  end: string;
  key: string;
  start: string;
}

/**
 * Splits each BusyPeriod into one segment per visible day it overlaps,
 * clamped to that day's [00:00, 24:00) window (packet 08 phase 4; A7). A
 * period that spans multiple days (or a full day) becomes multiple
 * same-calendar segments rather than one block that visually spills across
 * day columns - segments are then positioned independently by
 * {@link getCalendarBusyPeriodPosition} (calendarEventPosition.ts), the same
 * way each day of a recurring event gets its own card.
 */
export const splitBusyPeriodsByDay = (
  busyPeriods: BusyPeriod[],
  visibleDates: CalendarGridVisibleDate[],
): CalendarBusyPeriodDaySegment[] => {
  const segments: CalendarBusyPeriodDaySegment[] = [];

  for (const period of busyPeriods) {
    const periodStart = dayjs(period.start);
    const periodEnd = dayjs(period.end);

    for (const { date: day, key: dayKey } of visibleDates) {
      const dayStart = day.startOf("day");
      const dayEnd = day.endOf("day");
      const overlapsDay =
        periodStart.isBefore(dayEnd) && periodEnd.isAfter(dayStart);
      if (!overlapsDay) continue;

      const segmentStart = periodStart.isAfter(dayStart)
        ? periodStart
        : dayStart;
      const segmentEnd = periodEnd.isBefore(dayEnd) ? periodEnd : dayEnd;
      if (!segmentEnd.isAfter(segmentStart)) continue;

      segments.push({
        calendarId: period.calendarId,
        end: segmentEnd.format(),
        key: `${period.calendarId}-${period.start}-${period.end}-${dayKey}`,
        start: segmentStart.format(),
      });
    }
  }

  return segments;
};
