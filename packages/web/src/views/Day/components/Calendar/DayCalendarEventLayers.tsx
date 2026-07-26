import { useMemo } from "react";
import {
  isEventReadOnly,
  resolveCalendarCardIdentity,
  useCalendarLookup,
} from "@web/calendars/useCalendarLookup";
import {
  ID_GRID_EVENTS_ALLDAY,
  ID_GRID_EVENTS_TIMED,
} from "@web/common/constants/web.constants";
import { type GridEvent } from "@web/common/types/web.event.types";
import { type GridEventDraft } from "@web/events/event-draft.types";
import { GRID_MARGIN_LEFT } from "@web/grid/grid.constants";
import { createTimedEventLayout } from "@web/grid/layout/timed-deck.layout";
import {
  type GridMeasurements,
  type GridVisibleDate,
} from "@web/grid/types/grid.types";
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
  getCalendarColumnIndex: (event: GridEvent) => number;
  draft: GridEventDraft | null;
  events: GridEvent[];
  measurements: GridMeasurements;
  onOpenEvent: (event: GridEvent) => void;
  visibleDates: GridVisibleDate[];
}

export const DayCalendarAllDayEventsLayer = ({
  draft,
  events: allDayEvents,
  getCalendarColumnIndex,
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
        marginLeft: GRID_MARGIN_LEFT,
        position: "relative",
        width: `calc(100% - ${GRID_MARGIN_LEFT}px)`,
      }}
    >
      {renderedEvents.map((event) => (
        <DayAllDayCalendarEvent
          calendarIdentity={resolveCalendarCardIdentity(
            calendarLookup,
            event.calendarId,
          )}
          columnIndex={getCalendarColumnIndex(event)}
          event={event}
          isActiveDraft={isActiveDraftEvent(event, draft, savedEventIds)}
          isPlaceholder={isDraftOnlyEvent(event, draft, savedEventIds)}
          isReadOnly={isEventReadOnly(
            calendarLookup,
            event.calendarId,
            (event.isBusy ?? false) || (event.isTimedMultiDayDisplay ?? false),
          )}
          key={event._id ?? "all-day-draft"}
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
  getCalendarColumnIndex,
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
  const timedEventItems = useMemo(() => {
    const eventsByColumn = new Map<number, GridEvent[]>();
    for (const event of renderedEvents) {
      const columnIndex = getCalendarColumnIndex(event);
      const columnEvents = eventsByColumn.get(columnIndex) ?? [];
      columnEvents.push(event);
      eventsByColumn.set(columnIndex, columnEvents);
    }
    return [...eventsByColumn.values()].flatMap(createTimedEventLayout);
  }, [getCalendarColumnIndex, renderedEvents]);

  return (
    <div id={ID_GRID_EVENTS_TIMED}>
      {timedEventItems.map(({ deckLayout, event }) => (
        <DayTimedCalendarEvent
          calendarIdentity={resolveCalendarCardIdentity(
            calendarLookup,
            event.calendarId,
          )}
          columnIndex={getCalendarColumnIndex(event)}
          deckLayout={deckLayout}
          event={event}
          isActiveDraft={isActiveDraftEvent(event, draft, savedEventIds)}
          isPlaceholder={isDraftOnlyEvent(event, draft, savedEventIds)}
          isReadOnly={isEventReadOnly(
            calendarLookup,
            event.calendarId,
            event.isBusy ?? false,
          )}
          key={event._id ?? "timed-draft"}
          measurements={measurements}
          onOpenEvent={onOpenEvent}
          visibleDates={visibleDates}
        />
      ))}
    </div>
  );
};
