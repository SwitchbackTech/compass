import { type Calendar } from "@core/types/calendar.contracts";
import { type CalendarId } from "@core/types/domain-primitives";
import { type Dayjs } from "@core/util/date/dayjs";
import { getDefaultTargetCalendar } from "@web/calendars/calendar.util";
import { type GridEvent } from "@web/common/types/web.event.types";
import { isEventVisibleOnGrid } from "@web/events/visibility/filter-events-visible-on-grid";
import { getEffectiveTimeZone } from "@web/timezone/effective-timezone.store";
import { inEffectiveTimeZone } from "@web/timezone/in-time-zone";
import { isAllDayEventOnDay } from "./dayAllDayRows.util";

type DayViewCalendarColumnInput = {
  allDayEvents: GridEvent[];
  calendars: Calendar[];
  dateInView: Dayjs;
  defaultTargetCalendar?: Calendar;
  hiddenEventIds: ReadonlySet<string>;
  pinnedCalendarIds?: ReadonlySet<CalendarId>;
  timedEvents: GridEvent[];
};

const EMPTY_PINNED_CALENDAR_IDS: ReadonlySet<CalendarId> = new Set();

const eligibleCalendarsInOrder = (calendars: Calendar[]): Calendar[] => {
  const eligible = calendars.filter(
    (calendar) => calendar.isActive && calendar.isVisible,
  );

  if (eligible.length > 0) {
    return eligible;
  }

  const primaryCalendar = calendars.find((calendar) => calendar.isPrimary);
  if (primaryCalendar) {
    return [primaryCalendar];
  }

  return calendars.slice(0, 1);
};

const CIVIL_DAY_FORMAT = "YYYY-MM-DD";

const timedEventCivilDay = (event: GridEvent, viewZone: string) =>
  inEffectiveTimeZone(event.startDate, event.timeZone ?? viewZone).format(
    CIVIL_DAY_FORMAT,
  );

export const calendarIdsWithVisibleEventsOnDay = ({
  allDayEvents,
  dateInView,
  hiddenEventIds,
  timedEvents,
}: Pick<
  DayViewCalendarColumnInput,
  "allDayEvents" | "dateInView" | "hiddenEventIds" | "timedEvents"
>): Set<CalendarId> => {
  const ids = new Set<CalendarId>();
  const viewZone = getEffectiveTimeZone();
  const viewDay = inEffectiveTimeZone(dateInView, viewZone).format(
    CIVIL_DAY_FORMAT,
  );

  for (const event of timedEvents) {
    if (
      !event.calendarId ||
      !isEventVisibleOnGrid(event, hiddenEventIds) ||
      timedEventCivilDay(event, viewZone) !== viewDay
    ) {
      continue;
    }
    ids.add(event.calendarId);
  }

  for (const event of allDayEvents) {
    if (
      !event.calendarId ||
      !isEventVisibleOnGrid(event, hiddenEventIds) ||
      !isAllDayEventOnDay(event, dateInView)
    ) {
      continue;
    }
    ids.add(event.calendarId);
  }

  return ids;
};

export const getDayViewCalendars = ({
  allDayEvents,
  calendars,
  dateInView,
  defaultTargetCalendar,
  hiddenEventIds,
  pinnedCalendarIds = EMPTY_PINNED_CALENDAR_IDS,
  timedEvents,
}: DayViewCalendarColumnInput): Calendar[] => {
  const ordered = eligibleCalendarsInOrder(calendars);
  const eventCalendarIds = calendarIdsWithVisibleEventsOnDay({
    allDayEvents,
    dateInView,
    hiddenEventIds,
    timedEvents,
  });

  const withEventsOrPinned = ordered.filter(
    (calendar) =>
      eventCalendarIds.has(calendar.id) || pinnedCalendarIds.has(calendar.id),
  );

  if (withEventsOrPinned.length > 0) {
    return withEventsOrPinned;
  }

  const fallback =
    defaultTargetCalendar ??
    getDefaultTargetCalendar(calendars) ??
    ordered[0] ??
    calendars[0];

  return fallback ? [fallback] : [];
};
