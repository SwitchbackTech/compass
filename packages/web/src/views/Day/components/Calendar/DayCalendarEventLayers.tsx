import { useMemo } from "react";
import { type Schema_Event } from "@core/types/event.types";
import {
  isEventReadOnly,
  resolveCalendarCardIdentity,
  useCalendarLookup,
} from "@web/calendars/useCalendarLookup";
import {
  ID_GRID_EVENTS_ALLDAY,
  ID_GRID_EVENTS_TIMED,
} from "@web/common/constants/web.constants";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { CALENDAR_GRID_MARGIN_LEFT } from "@web/layout/calendar-grid/calendarGrid.constants";
import { createCalendarTimedEventLayout } from "@web/layout/calendar-grid/layout/calendarTimedDeckLayout";
import {
  type CalendarGridMeasurements,
  type CalendarGridVisibleDate,
} from "@web/layout/calendar-grid/types/calendarGrid.types";
import {
  DayAllDayCalendarEvent,
  DayTimedCalendarEvent,
} from "./DayCalendarEventCards";
import {
  addVisibleDraftEvent,
  getCalendarEventIdSet,
  isActiveDraftEvent,
  isDraftOnlyEvent,
} from "./dayCalendarDraft.util";

interface DayEventsProps {
  draft: Schema_Event | null;
  events: Schema_GridEvent[];
  measurements: CalendarGridMeasurements;
  onOpenEvent: (event: Schema_GridEvent) => void;
  visibleDates: CalendarGridVisibleDate[];
}

export const DayCalendarAllDayEventsLayer = ({
  draft,
  events: allDayEvents,
  measurements,
  onOpenEvent,
  visibleDates,
}: DayEventsProps) => {
  // One lookup build for the whole list (packet 08 step 5) - not per card.
  const calendarLookup = useCalendarLookup();
  const savedEventIds = useMemo(
    () => getCalendarEventIdSet(allDayEvents),
    [allDayEvents],
  );
  const renderedEvents = useMemo(
    () =>
      addVisibleDraftEvent({
        draft,
        events: allDayEvents,
        isAllDay: true,
        visibleDates,
      }),
    [allDayEvents, draft, visibleDates],
  );

  return (
    <div
      id={ID_GRID_EVENTS_ALLDAY}
      style={{
        height: "100%",
        marginLeft: CALENDAR_GRID_MARGIN_LEFT,
        position: "relative",
        width: `calc(100% - ${CALENDAR_GRID_MARGIN_LEFT}px)`,
      }}
    >
      {renderedEvents.map((event) => (
        <DayAllDayCalendarEvent
          calendarIdentity={resolveCalendarCardIdentity(
            calendarLookup,
            event.calendarId,
          )}
          event={event}
          isActiveDraft={isActiveDraftEvent(event, draft, savedEventIds)}
          isPlaceholder={isDraftOnlyEvent(event, draft, savedEventIds)}
          isReadOnly={isEventReadOnly(
            calendarLookup,
            event.calendarId,
            event.isBusy ?? false,
          )}
          key={event._id}
          measurements={measurements}
          onOpenEvent={onOpenEvent}
          visibleDates={visibleDates}
        />
      ))}
    </div>
  );
};

export const DayCalendarTimedEventsLayer = ({
  draft,
  events: timedEvents,
  measurements,
  onOpenEvent,
  visibleDates,
}: DayEventsProps) => {
  // One lookup build for the whole list (packet 08 step 5) - not per card.
  const calendarLookup = useCalendarLookup();
  const savedEventIds = useMemo(
    () => getCalendarEventIdSet(timedEvents),
    [timedEvents],
  );
  const renderedEvents = useMemo(
    () =>
      addVisibleDraftEvent({
        draft,
        events: timedEvents,
        isAllDay: false,
        visibleDates,
      }),
    [draft, timedEvents, visibleDates],
  );
  const timedEventItems = useMemo(
    () => createCalendarTimedEventLayout(renderedEvents),
    [renderedEvents],
  );

  return (
    <div id={ID_GRID_EVENTS_TIMED}>
      {timedEventItems.map(({ deckLayout, event }) => (
        <DayTimedCalendarEvent
          calendarIdentity={resolveCalendarCardIdentity(
            calendarLookup,
            event.calendarId,
          )}
          deckLayout={deckLayout}
          event={event}
          isActiveDraft={isActiveDraftEvent(event, draft, savedEventIds)}
          isPlaceholder={isDraftOnlyEvent(event, draft, savedEventIds)}
          isReadOnly={isEventReadOnly(
            calendarLookup,
            event.calendarId,
            event.isBusy ?? false,
          )}
          key={event._id}
          measurements={measurements}
          onOpenEvent={onOpenEvent}
          visibleDates={visibleDates}
        />
      ))}
    </div>
  );
};
