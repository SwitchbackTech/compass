import { useDismiss, useInteractions } from "@floating-ui/react";
import {
  setEntities,
  UIEntitiesRef,
  updateEntities,
} from "@ngneat/elf-entities";
import {
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import {
  Categories_Event,
  type Schema_Event,
  type WithCompassId,
} from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import {
  CALENDAR_DRAFT_DURATION_MIN,
  CALENDAR_GRID_MARGIN_LEFT,
} from "@web/common/calendar-grid/calendarGrid.constants";
import { CalendarAllDayEventCard } from "@web/common/calendar-grid/components/CalendarAllDayEventCard";
import { CalendarGrid } from "@web/common/calendar-grid/components/CalendarGrid";
import { CalendarTimedEventCard } from "@web/common/calendar-grid/components/CalendarTimedEventCard";
import { useCalendarDateCalcs } from "@web/common/calendar-grid/hooks/useCalendarDateCalcs";
import { useCalendarGridLayout } from "@web/common/calendar-grid/hooks/useCalendarGridLayout";
import {
  getCalendarAllDayEventPosition,
  getCalendarTimedEventPosition,
} from "@web/common/calendar-grid/layout/calendarEventPosition";
import {
  applyCalendarTimedDeckPosition,
  type CalendarTimedDeckLayout,
  createCalendarTimedEventLayout,
} from "@web/common/calendar-grid/layout/calendarTimedDeckLayout";
import {
  type CalendarGridMeasurements,
  type CalendarGridVisibleDate,
} from "@web/common/calendar-grid/types/calendarGrid.types";
import {
  ID_GRID_EVENTS_ALLDAY,
  ID_GRID_EVENTS_TIMED,
} from "@web/common/constants/web.constants";
import { useFloatingAtCursor } from "@web/common/hooks/useFloatingAtCursor";
import {
  CursorItem,
  openFloatingAtCursor,
} from "@web/common/hooks/useOpenAtCursor";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import {
  addId,
  assembleDefaultEvent,
  assembleGridEvent,
  compareEventsByStartDate,
  getCalendarEventElementFromGrid,
  hasEventDates,
} from "@web/common/utils/event/event.util";
import { isRightClick } from "@web/common/utils/mouse/mouse.util";
import { FloatingEventForm } from "@web/components/FloatingEventForm/FloatingEventForm";
import {
  selectAllDayDayEvents,
  selectDayEvents,
  selectDayRowCount,
  selectTimedDayEvents,
} from "@web/ducks/events/selectors/event.selectors";
import { selectPendingEventIds } from "@web/ducks/events/selectors/pending.selectors";
import { eventsStore, resetDraft, setDraft } from "@web/store/events";
import { useAppSelector } from "@web/store/store.hooks";
import { useDateInView } from "@web/views/Day/hooks/navigation/useDateInView";
import { DayInteractionCoordinator } from "@web/views/Day/interaction/DayInteractionCoordinator";
import {
  type DayInteractionEventType,
  dayCalendarEventRegistry,
  getDayInteractionTargetAttributes,
} from "@web/views/Day/interaction/registry/dayCalendarEventRegistry";
import {
  clearHoveredDayCalendarEventTarget,
  setHoveredDayCalendarEventTarget,
} from "@web/views/Day/interaction/targeting/dayCalendarEventTargeting";
import { useDraft } from "@web/views/Week/components/Draft/context/useDraft";

const isDayInteractionMotionActive = () => false;

export function DayCalendarGrid() {
  const dateInView = useDateInView();
  const visibleDates = useMemo(
    () => [
      {
        date: dateInView,
        key: dateInView.format(YEAR_MONTH_DAY_FORMAT),
      },
    ],
    [dateInView],
  );
  const { gridRefs, measurements } = useCalendarGridLayout({
    isInteractionMotionActive: isDayInteractionMotionActive,
    visibleDateCount: 1,
  });
  const dateCalcs = useCalendarDateCalcs(
    measurements,
    gridRefs.mainGridRef,
    visibleDates,
  );
  const today = useMemo(() => dayjs(), []);
  const dayEvents = useAppSelector(selectDayEvents);
  const allDayRowsCount = useAppSelector(selectDayRowCount);
  const draft = useDraft();
  const floating = useFloatingAtCursor((open, _event, reason) => {
    const dismissed = reason === "escape-key" || reason === "outside-press";

    if (!open && dismissed) {
      resetDraft();
    }
  });
  const dismiss = useDismiss(floating.context, { enabled: true });
  const interactions = useInteractions([dismiss]);

  useEffect(() => {
    const eventsWithIds = dayEvents.filter(
      (event): event is WithCompassId<Schema_Event> => Boolean(event._id),
    );

    eventsStore.update(
      setEntities(eventsWithIds.sort(compareEventsByStartDate)),
      updateEntities(
        eventsWithIds.map((event) => event._id),
        {},
        { ref: UIEntitiesRef },
      ),
    );
  }, [dayEvents]);

  const getDayInteractionLayoutSources = useCallback(
    () => ({
      allDayColumnsElement: gridRefs.allDayColumnsRef.current,
      mainGridElement: gridRefs.mainGridRef.current,
      timedColumnsElement: gridRefs.timedColumnsRef.current,
    }),
    [gridRefs.allDayColumnsRef, gridRefs.mainGridRef, gridRefs.timedColumnsRef],
  );

  const openEventFormForEvent = useCallback((event: Schema_GridEvent) => {
    if (!event._id) {
      return;
    }

    setDraft({ ...event, _id: event._id });

    queueMicrotask(() => {
      const eventType = getDayInteractionEventType(event);
      const reference =
        dayCalendarEventRegistry.resolve(event._id!, eventType) ??
        getCalendarEventElementFromGrid(event._id!);

      if (reference) {
        openFloatingAtCursor({
          nodeId: CursorItem.EventForm,
          reference,
        });
      }
    });
  }, []);

  const onAllDayMouseDown = useCallback(
    async (event: MouseEvent<HTMLElement>) => {
      if (isRightClick(event)) {
        return;
      }

      const selectedDate =
        visibleDates[dateCalcs.getVisibleDateIndexByX(event.clientX)]?.date ??
        dateInView;
      const startDate = selectedDate.format(YEAR_MONTH_DAY_FORMAT);
      const endDate = selectedDate.add(1, "day").format(YEAR_MONTH_DAY_FORMAT);
      const draftEvent = await assembleDefaultEvent(
        Categories_Event.ALLDAY,
        startDate,
        endDate,
      );

      openEventFormForEvent(
        addId(assembleGridEvent(draftEvent as EventWithDates)),
      );
    },
    [dateCalcs, dateInView, openEventFormForEvent, visibleDates],
  );

  const onTimedMouseDown = useCallback(
    async (event: MouseEvent<HTMLElement>) => {
      if (isRightClick(event)) {
        return;
      }

      const startDate = dateCalcs.getDateByXY(event.clientX, event.clientY);
      const endDate = startDate.add(CALENDAR_DRAFT_DURATION_MIN, "minutes");
      const draftEvent = await assembleDefaultEvent(
        Categories_Event.TIMED,
        startDate.format(),
        endDate.format(),
      );

      openEventFormForEvent(addId(draftEvent as Schema_GridEvent));
    },
    [dateCalcs, openEventFormForEvent],
  );

  return (
    <section
      aria-label="Calendar agenda"
      className="flex h-full min-w-xs flex-1 flex-col bg-bg-primary p-0.5"
    >
      <DayInteractionCoordinator
        dateInView={dateInView}
        getLayoutSources={getDayInteractionLayoutSources}
      >
        <CalendarGrid
          allDayEventsLayer={
            <DayAllDayEvents
              draft={draft}
              measurements={measurements}
              onOpenEvent={openEventFormForEvent}
              visibleDates={visibleDates}
            />
          }
          allDayRowsCount={allDayRowsCount}
          gridRefs={gridRefs}
          onAllDayMouseDown={onAllDayMouseDown}
          onTimedMouseDown={onTimedMouseDown}
          timedEventsLayer={
            <DayTimedEvents
              draft={draft}
              measurements={measurements}
              onOpenEvent={openEventFormForEvent}
              visibleDates={visibleDates}
            />
          }
          today={today}
          visibleDates={visibleDates}
        />
      </DayInteractionCoordinator>
      <FloatingEventForm floating={floating} interactions={interactions} />
    </section>
  );
}

interface DayEventsProps {
  draft: Schema_Event | null;
  measurements: CalendarGridMeasurements;
  onOpenEvent: (event: Schema_GridEvent) => void;
  visibleDates: CalendarGridVisibleDate[];
}

type EventWithDates = Schema_Event & {
  startDate: string;
  endDate: string;
};

const DayAllDayEvents = ({
  draft,
  measurements,
  onOpenEvent,
  visibleDates,
}: DayEventsProps) => {
  const allDayEvents = useAppSelector(selectAllDayDayEvents);
  const pendingEventIds = useAppSelector(selectPendingEventIds);
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
        <DayAllDayEvent
          event={event}
          isPending={Boolean(event._id && pendingEventIds.includes(event._id))}
          isPlaceholder={event._id === draft?._id}
          key={event._id}
          measurements={measurements}
          onOpenEvent={onOpenEvent}
          visibleDates={visibleDates}
        />
      ))}
    </div>
  );
};

interface DayEventCardProps {
  event: Schema_GridEvent;
  isPending: boolean;
  isPlaceholder: boolean;
  measurements: CalendarGridMeasurements;
  onOpenEvent: (event: Schema_GridEvent) => void;
  visibleDates: CalendarGridVisibleDate[];
}

interface DayTimedEventCardProps extends DayEventCardProps {
  deckLayout: CalendarTimedDeckLayout | null;
}

const DayAllDayEvent = ({
  event,
  isPending,
  isPlaceholder,
  measurements,
  onOpenEvent,
  visibleDates,
}: DayEventCardProps) => {
  const isRegistered = Boolean(event._id) && !isPending && !isPlaceholder;
  const registrationRef = useDayEventRegistrationRef({
    eventId: event._id,
    eventType: "all-day",
    isEnabled: isRegistered,
  });
  const interactionAttributes = useMemo(
    () =>
      isRegistered
        ? getDayInteractionTargetAttributes({
            eventId: event._id,
            eventType: "all-day",
          })
        : undefined,
    [event._id, isRegistered],
  );

  return (
    <CalendarAllDayEventCard
      event={event}
      interactionAttributes={interactionAttributes}
      isPending={isPending}
      isPlaceholder={isPlaceholder}
      onEventKeyDown={onOpenEvent}
      onMouseEnter={(mouseEvent) => {
        if (!isRegistered) return;

        setHoveredDayCalendarEventTarget(mouseEvent.currentTarget);
      }}
      onMouseLeave={(mouseEvent) => {
        clearHoveredDayCalendarEventTarget(mouseEvent.currentTarget);
      }}
      position={getCalendarAllDayEventPosition(event, {
        isDraft: isPlaceholder,
        measurements,
        visibleDates,
      })}
      ref={registrationRef}
    />
  );
};

const DayTimedEvents = ({
  draft,
  measurements,
  onOpenEvent,
  visibleDates,
}: DayEventsProps) => {
  const timedEvents = useAppSelector(selectTimedDayEvents);
  const pendingEventIds = useAppSelector(selectPendingEventIds);
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
        <DayTimedEvent
          deckLayout={deckLayout}
          event={event}
          isPending={Boolean(event._id && pendingEventIds.includes(event._id))}
          isPlaceholder={event._id === draft?._id}
          key={event._id}
          measurements={measurements}
          onOpenEvent={onOpenEvent}
          visibleDates={visibleDates}
        />
      ))}
    </div>
  );
};

const DayTimedEvent = ({
  deckLayout,
  event,
  isPending,
  isPlaceholder,
  measurements,
  onOpenEvent,
  visibleDates,
}: DayTimedEventCardProps) => {
  const isRegistered = Boolean(event._id) && !isPending && !isPlaceholder;
  const registrationRef = useDayEventRegistrationRef({
    eventId: event._id,
    eventType: "timed",
    isEnabled: isRegistered,
  });
  const interactionAttributes = useMemo(
    () =>
      isRegistered
        ? getDayInteractionTargetAttributes({
            eventId: event._id,
            eventType: "timed",
          })
        : undefined,
    [event._id, isRegistered],
  );

  return (
    <CalendarTimedEventCard
      displayMode={isPlaceholder ? "placeholder" : "saved"}
      event={event}
      interactionAttributes={interactionAttributes}
      isPending={isPending}
      motionMode="idle"
      onEventKeyDown={onOpenEvent}
      onMouseEnter={(mouseEvent) => {
        if (!isRegistered) return;

        setHoveredDayCalendarEventTarget(mouseEvent.currentTarget);
      }}
      onMouseLeave={(mouseEvent) => {
        clearHoveredDayCalendarEventTarget(mouseEvent.currentTarget);
      }}
      position={getDayTimedEventPosition({
        deckLayout,
        event,
        isPlaceholder,
        measurements,
        visibleDates,
      })}
      ref={registrationRef}
    />
  );
};

const getDayTimedEventPosition = ({
  deckLayout,
  event,
  isPlaceholder,
  measurements,
  visibleDates,
}: {
  deckLayout: CalendarTimedDeckLayout | null;
  event: Schema_GridEvent;
  isPlaceholder: boolean;
  measurements: CalendarGridMeasurements;
  visibleDates: CalendarGridVisibleDate[];
}) => {
  const position = getCalendarTimedEventPosition(event, {
    isDraft: isPlaceholder,
    measurements,
    visibleDates,
  });

  return deckLayout
    ? applyCalendarTimedDeckPosition(position, deckLayout)
    : position;
};

const addVisibleDraftEvent = ({
  draft,
  events,
  isAllDay,
  visibleDates,
}: {
  draft: Schema_Event | null;
  events: Schema_GridEvent[];
  isAllDay: boolean;
  visibleDates: CalendarGridVisibleDate[];
}) => {
  if (
    !draft ||
    draft.isAllDay !== isAllDay ||
    !hasEventDates(draft) ||
    !isDraftVisibleOnDate(draft, visibleDates)
  ) {
    return events;
  }

  const draftEvent = assembleGridEvent(draft);
  const existingIndex = events.findIndex((event) => event._id === draft._id);

  if (existingIndex === -1) {
    return [draftEvent, ...events];
  }

  const nextEvents = [...events];
  nextEvents[existingIndex] = {
    ...draftEvent,
    position: events[existingIndex].position,
    row: events[existingIndex].row,
  };

  return nextEvents;
};

const isDraftVisibleOnDate = (
  draft: EventWithDates,
  visibleDates: CalendarGridVisibleDate[],
) => {
  const visibleDate = visibleDates[0]?.date;

  if (!visibleDate) {
    return false;
  }

  if (!draft.isAllDay) {
    return dayjs(draft.startDate).isSame(visibleDate, "day");
  }

  const visibleDay = visibleDate.startOf("day");
  const start = dayjs(draft.startDate).startOf("day");
  const end = dayjs(draft.endDate).startOf("day");
  const inclusiveEnd = end.isAfter(start) ? end.subtract(1, "day") : start;

  return (
    visibleDay.isSame(start) ||
    visibleDay.isSame(inclusiveEnd) ||
    (visibleDay.isAfter(start) && visibleDay.isBefore(inclusiveEnd))
  );
};

const getDayInteractionEventType = (
  event: Schema_GridEvent,
): DayInteractionEventType => (event.isAllDay ? "all-day" : "timed");

const useDayEventRegistrationRef = ({
  eventId,
  eventType,
  isEnabled,
}: {
  eventId: string | undefined;
  eventType: DayInteractionEventType;
  isEnabled: boolean;
}) => {
  const unregisterRef = useRef<(() => void) | null>(null);

  return useCallback(
    (node: HTMLDivElement | null) => {
      unregisterRef.current?.();
      unregisterRef.current = null;

      if (!node || !eventId || !isEnabled) {
        return;
      }

      unregisterRef.current = dayCalendarEventRegistry.register({
        element: node,
        eventId,
        eventType,
      });
    },
    [eventId, eventType, isEnabled],
  );
};
