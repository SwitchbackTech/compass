import { useCallback, useMemo } from "react";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { type CalendarId } from "@core/types/domain-primitives";
import { type Dayjs } from "@core/util/date/dayjs";
import { useCalendarsQuery } from "@web/calendars/calendar.query";
import { useDefaultTargetCalendar } from "@web/calendars/useDefaultTargetCalendar";
import { type GridEvent } from "@web/common/types/web.event.types";
import { useHiddenEventIds } from "@web/events/hidden/hidden-events.query";
import {
  selectGridDraft,
  selectIsEventFormOpen,
  useDraftStore,
} from "@web/events/stores/draft.store";
import { isAllDayEventOnDay } from "./dayAllDayRows.util";
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
  const hiddenEventIds = useHiddenEventIds();
  const gridDraft = useDraftStore(selectGridDraft);
  const isEventFormOpen = useDraftStore(selectIsEventFormOpen);
  const defaultTargetCalendar = useDefaultTargetCalendar(calendars);

  const pinnedCalendarIds = useMemo(() => {
    const pinned = new Set<CalendarId>();
    const draftCalendarId = gridDraft?.values.calendarId;
    if (draftCalendarId) {
      pinned.add(draftCalendarId);
    }
    if (isEventFormOpen && gridDraft?.kind === "edit" && gridDraft.source.id) {
      const source = [...timedEvents, ...allDayEvents].find(
        (event) => event._id === gridDraft.source.id,
      );
      if (source?.calendarId) {
        pinned.add(source.calendarId);
      }
    }
    return pinned;
  }, [allDayEvents, gridDraft, isEventFormOpen, timedEvents]);

  const displayedCalendars = useMemo(
    () =>
      getDayViewCalendars({
        allDayEvents,
        calendars,
        dateInView,
        defaultTargetCalendar,
        hiddenEventIds,
        pinnedCalendarIds,
        timedEvents,
      }),
    [
      allDayEvents,
      calendars,
      dateInView,
      defaultTargetCalendar,
      hiddenEventIds,
      pinnedCalendarIds,
      timedEvents,
    ],
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
  // Day all-day row stacking (including drafts) is owned by DayCalendarGrid so
  // strip height and chips stay in sync. Also drop chips whose date span
  // does not cover dateInView (week has the same second pass) so a Sync
  // startAt skew cannot paint tomorrow's all-day event on today.
  const displayedAllDayEvents = useMemo(
    () =>
      allDayEvents.filter(
        (event) =>
          isDisplayedEvent(event) && isAllDayEventOnDay(event, dateInView),
      ),
    [allDayEvents, dateInView, isDisplayedEvent],
  );
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
    isDisplayedEvent,
    visibleDates,
  };
};
