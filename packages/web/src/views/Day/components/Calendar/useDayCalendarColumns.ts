import { useCallback, useMemo } from "react";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { type Dayjs } from "@core/util/date/dayjs";
import { useCalendarsQuery } from "@web/calendars/calendar.query";
import { type GridEvent } from "@web/common/types/web.event.types";
import { assignDayAllDayEventRows } from "./dayAllDayRows.util";
import { getDayViewCalendars } from "./dayCalendarColumns.util";

export const useDayCalendarColumns = ({
  allDayEvents,
  dateInView,
  timedEvents,
}: {
  allDayEvents: GridEvent[];
  dateInView: Dayjs;
  timedEvents: GridEvent[];
}) => {
  const { data: calendars = [] } = useCalendarsQuery();
  const displayedCalendars = useMemo(
    () => getDayViewCalendars(calendars),
    [calendars],
  );
  const calendarColumnIndexById = useMemo(
    () =>
      new Map(
        displayedCalendars.map((calendar, index) => [calendar.id, index]),
      ),
    [displayedCalendars],
  );
  const calendarIds = useMemo(
    () => new Set(calendars.map((calendar) => calendar.id)),
    [calendars],
  );
  const visibleDates = useMemo(() => {
    const columns = displayedCalendars.map((calendar) => ({
      date: dateInView,
      key: calendar.id,
      surfaceLabel: `${calendar.name}, ${dateInView.format("dddd, MMMM D, YYYY")}`,
    }));

    return columns.length
      ? columns
      : [{ date: dateInView, key: dateInView.format(YEAR_MONTH_DAY_FORMAT) }];
  }, [dateInView, displayedCalendars]);
  const getCalendarColumnIndex = useCallback(
    (event: GridEvent) =>
      (event.calendarId
        ? calendarColumnIndexById.get(event.calendarId)
        : undefined) ?? 0,
    [calendarColumnIndexById],
  );
  const isDisplayedEvent = useCallback(
    (event: GridEvent) =>
      !event.calendarId ||
      !calendarIds.has(event.calendarId) ||
      calendarColumnIndexById.has(event.calendarId),
    [calendarColumnIndexById, calendarIds],
  );
  // Row assignment that includes an all-day draft lives in DayCalendarGrid so
  // strip height and chips share one draft-aware stack.
  const displayedAllDayEvents = useMemo(() => {
    const visibleEvents = allDayEvents.filter(isDisplayedEvent);
    return assignDayAllDayEventRows(visibleEvents, getCalendarColumnIndex)
      .allDayEvents;
  }, [allDayEvents, getCalendarColumnIndex, isDisplayedEvent]);
  const displayedTimedEvents = useMemo(
    () => timedEvents.filter(isDisplayedEvent),
    [isDisplayedEvent, timedEvents],
  );

  return {
    calendarColumnIndexById,
    displayedAllDayEvents,
    displayedCalendars,
    displayedTimedEvents,
    getCalendarColumnIndex,
    visibleDates,
  };
};
