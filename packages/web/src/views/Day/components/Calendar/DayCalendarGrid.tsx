import { useDismiss, useInteractions } from "@floating-ui/react";
import {
  setEntities,
  UIEntitiesRef,
  updateEntities,
} from "@ngneat/elf-entities";
import {
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { type Priorities } from "@core/constants/core.constants";
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
  CALENDAR_TIMED_VISIBLE_HOURS,
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
  hasExceededCalendarInteractionMoveThreshold,
  isEligibleCalendarInteractionPointerDown,
} from "@web/common/calendar-interaction/calendarInteractionPointer";
import {
  ID_GRID_EVENTS_ALLDAY,
  ID_GRID_EVENTS_TIMED,
  ZIndex,
} from "@web/common/constants/web.constants";
import { useFloatingAtCursor } from "@web/common/hooks/useFloatingAtCursor";
import {
  CursorItem,
  closeFloatingAtCursor,
  nodeId$,
  openFloatingAtCursor,
  useFloatingNodeIdAtCursor,
  useFloatingOpenAtCursor,
} from "@web/common/hooks/useOpenAtCursor";
import { useUpdateEvent } from "@web/common/hooks/useUpdateEvent";
import { theme } from "@web/common/styles/theme";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import {
  CompassDOMEvents,
  compassEventEmitter,
} from "@web/common/utils/dom/event-emitter.util";
import {
  addId,
  assembleDefaultEvent,
  assembleGridEvent,
  compareEventsByStartDate,
  getCalendarEventElementFromGrid,
  getCalendarEventIdFromElement,
  hasEventDates,
} from "@web/common/utils/event/event.util";
import { getCurrentMinute } from "@web/common/utils/grid/grid.util";
import { isRightClick } from "@web/common/utils/mouse/mouse.util";
import { ContextMenu } from "@web/components/ContextMenu/ContextMenu";
import { type ContextMenuItemsActions } from "@web/components/ContextMenu/ContextMenuItems";
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
import { useDeleteEvent } from "@web/views/Forms/hooks/useDeleteEvent";
import { useDuplicateEvent } from "@web/views/Forms/hooks/useDuplicateEvent";
import { useDraft } from "@web/views/Week/components/Draft/context/useDraft";

const isDayInteractionMotionActive = () => false;
const TIMED_DRAFT_CREATE_MOVE_THRESHOLD_PX = 4;

interface TimedDraftCreationGesture {
  cancel(): void;
}

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
  const pendingEventIds = useAppSelector(selectPendingEventIds);
  const draft = useDraft();
  const floating = useFloatingAtCursor((open, _event, reason) => {
    const dismissed = reason === "escape-key" || reason === "outside-press";

    if (!open && dismissed && nodeId$.getValue() === CursorItem.EventForm) {
      resetDraft();
    }
  });
  const dismiss = useDismiss(floating.context, { enabled: true });
  const interactions = useInteractions([dismiss]);
  const isFloatingOpen = useFloatingOpenAtCursor();
  const floatingNodeId = useFloatingNodeIdAtCursor();
  const timedDraftCreationGestureRef = useRef<TimedDraftCreationGesture | null>(
    null,
  );
  const contextMenuAnchorRef = useRef<HTMLDivElement | null>(null);
  const [contextMenuEvent, setContextMenuEvent] =
    useState<Schema_GridEvent | null>(null);
  const contextMenuEventId = contextMenuEvent?._id ?? "";
  const duplicateContextMenuEvent = useDuplicateEvent(contextMenuEventId);
  const deleteContextMenuEvent = useDeleteEvent(contextMenuEventId);
  const updateEvent = useUpdateEvent();

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

  useEffect(
    () => () => {
      timedDraftCreationGestureRef.current?.cancel();
    },
    [],
  );

  const getDayInteractionLayoutSources = useCallback(
    () => ({
      allDayColumnsElement: gridRefs.allDayColumnsRef.current,
      mainGridElement: gridRefs.mainGridRef.current,
      timedColumnsElement: gridRefs.timedColumnsRef.current,
    }),
    [gridRefs.allDayColumnsRef, gridRefs.mainGridRef, gridRefs.timedColumnsRef],
  );

  const scrollToNow = useCallback(() => {
    const timedGrid = gridRefs.mainGridRef.current;

    if (!timedGrid) {
      return;
    }

    const gridRowHeight = timedGrid.clientHeight / CALENDAR_TIMED_VISIBLE_HOURS;
    const minuteHeight = gridRowHeight / 60;
    const top = getCurrentMinute() * minuteHeight - 150;

    timedGrid.scroll({
      behavior: "smooth",
      top,
    });
  }, [gridRefs.mainGridRef]);

  useEffect(() => {
    if (!gridRefs.mainGridRef.current) {
      return;
    }

    scrollToNow();
  }, [gridRefs.mainGridRef, scrollToNow]);

  useEffect(() => {
    compassEventEmitter.on(CompassDOMEvents.SCROLL_TO_NOW_LINE, scrollToNow);

    return () => {
      compassEventEmitter.off(CompassDOMEvents.SCROLL_TO_NOW_LINE, scrollToNow);
    };
  }, [scrollToNow]);

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

  const closeContextMenu = useCallback(() => {
    setContextMenuEvent(null);
    closeFloatingAtCursor();
  }, []);

  const getDayEventById = useCallback(
    (eventId: string): Schema_GridEvent | null => {
      const event = dayEvents.find((dayEvent) => dayEvent._id === eventId);

      if (!event || !hasEventDates(event)) {
        return null;
      }

      return assembleGridEvent(event);
    },
    [dayEvents],
  );

  const handleContextMenu = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      const target = event.target;

      if (!(target instanceof HTMLElement)) {
        return;
      }

      const eventId = getCalendarEventIdFromElement(target);

      if (!eventId) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (pendingEventIds.includes(eventId)) {
        return;
      }

      const selectedEvent = getDayEventById(eventId);
      const anchor = contextMenuAnchorRef.current;

      if (!selectedEvent || !anchor) {
        return;
      }

      anchor.style.left = `${event.clientX}px`;
      anchor.style.top = `${event.clientY}px`;
      setContextMenuEvent(selectedEvent);
      openFloatingAtCursor({
        nodeId: CursorItem.EventContextMenu,
        reference: anchor,
      });
    },
    [getDayEventById, pendingEventIds],
  );

  const contextMenuActions = useMemo<ContextMenuItemsActions>(
    () => ({
      delete: () => {
        deleteContextMenuEvent();
      },
      duplicate: () => {
        duplicateContextMenuEvent();
      },
      edit: () => {
        if (!contextMenuEvent) {
          return;
        }

        openEventFormForEvent(contextMenuEvent);
      },
      editPriority: (priority: Priorities) => {
        if (!contextMenuEvent) {
          return;
        }

        updateEvent({ event: { ...contextMenuEvent, priority } }, true);
      },
    }),
    [
      contextMenuEvent,
      deleteContextMenuEvent,
      duplicateContextMenuEvent,
      openEventFormForEvent,
      updateEvent,
    ],
  );

  const isContextMenuOpen =
    isFloatingOpen && floatingNodeId === CursorItem.EventContextMenu;

  const onAllDayMouseDown = useCallback(
    async (event: ReactMouseEvent<HTMLElement>) => {
      if (isRightClick(event)) {
        return;
      }

      if (draft) {
        resetDraft();
        closeFloatingAtCursor();
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
    [dateCalcs, dateInView, draft, openEventFormForEvent, visibleDates],
  );

  const onTimedMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      if (
        !isEligibleCalendarInteractionPointerDown({
          altKey: event.altKey,
          button: event.button,
          ctrlKey: event.ctrlKey,
          isPrimary: true,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey,
        })
      ) {
        return;
      }

      if (draft) {
        resetDraft();
        closeFloatingAtCursor();
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      timedDraftCreationGestureRef.current?.cancel();

      const pointerStart = getPointerPoint(event);
      const startDate = dateCalcs.getDateByXY(event.clientX, event.clientY);
      const minimumEndDate = startDate.add(
        CALENDAR_DRAFT_DURATION_MIN,
        "minutes",
      );
      const draftEvent = assembleDefaultEvent(
        Categories_Event.TIMED,
        startDate.format(),
        minimumEndDate.format(),
      ).then((nextEvent) => addId(nextEvent as Schema_GridEvent));
      let hasMoved = false;
      let isCancelled = false;
      let isFinished = false;

      const resolveEventForPointer = async ({
        x,
        y,
      }: {
        x: number;
        y: number;
      }) => {
        const nextEvent = await draftEvent;
        const pointerDate = dateCalcs.getDateByXY(x, y);
        const isSameDayDrag = hasMoved && pointerDate.isSame(startDate, "day");
        const isUpwardDrag = isSameDayDrag && pointerDate.isBefore(startDate);
        const isDownwardDragPastMinimum =
          isSameDayDrag && pointerDate.isAfter(minimumEndDate);
        const resolvedStartDate = isUpwardDrag ? pointerDate : startDate;
        const resolvedEndDate = isDownwardDragPastMinimum
          ? pointerDate
          : isUpwardDrag
            ? startDate
            : minimumEndDate;

        return {
          ...nextEvent,
          endDate: resolvedEndDate.format(),
          startDate: resolvedStartDate.format(),
        };
      };

      const cleanup = () => {
        window.removeEventListener("mousemove", handleMouseMove, true);
        window.removeEventListener("mouseup", handleMouseUp, true);
        window.removeEventListener("blur", handleWindowBlur);
        timedDraftCreationGestureRef.current = null;
      };

      const previewTimedDraft = (mouseEvent: MouseEvent) => {
        void resolveEventForPointer(getPointerPoint(mouseEvent)).then(
          (nextEvent) => {
            if (isCancelled || isFinished) {
              return;
            }

            setDraft(nextEvent as WithCompassId<Schema_Event>);
          },
        );
      };

      const openTimedDraft = (mouseEvent: MouseEvent) => {
        void resolveEventForPointer(getPointerPoint(mouseEvent)).then(
          (nextEvent) => {
            if (isCancelled) {
              return;
            }

            openEventFormForEvent(nextEvent);
          },
        );
      };

      function finish(mouseEvent: MouseEvent) {
        if (isFinished || isCancelled) {
          return;
        }

        isFinished = true;
        cleanup();
        mouseEvent.preventDefault();
        mouseEvent.stopPropagation();
        openTimedDraft(mouseEvent);
      }

      function cancel() {
        if (isFinished || isCancelled) {
          return;
        }

        isCancelled = true;
        cleanup();

        if (hasMoved) {
          resetDraft();
        }
      }

      function handleMouseMove(mouseEvent: MouseEvent) {
        if (isFinished || isCancelled) {
          return;
        }

        if (mouseEvent.buttons !== 1) {
          finish(mouseEvent);
          return;
        }

        if (
          !hasMoved &&
          !hasExceededCalendarInteractionMoveThreshold(
            getPointerPoint(mouseEvent),
            pointerStart,
            TIMED_DRAFT_CREATE_MOVE_THRESHOLD_PX,
          )
        ) {
          return;
        }

        hasMoved = true;
        previewTimedDraft(mouseEvent);
      }

      function handleMouseUp(mouseEvent: MouseEvent) {
        finish(mouseEvent);
      }

      function handleWindowBlur() {
        cancel();
      }

      window.addEventListener("mousemove", handleMouseMove, true);
      window.addEventListener("mouseup", handleMouseUp, true);
      window.addEventListener("blur", handleWindowBlur);
      timedDraftCreationGestureRef.current = { cancel };
    },
    [dateCalcs, draft, openEventFormForEvent],
  );

  return (
    <section
      aria-label="Calendar agenda"
      className="flex h-full min-w-xs flex-1 flex-col bg-bg-primary p-0.5"
      onContextMenu={handleContextMenu}
    >
      <div
        aria-hidden="true"
        ref={contextMenuAnchorRef}
        style={{
          height: 0,
          left: 0,
          pointerEvents: "none",
          position: "fixed",
          top: 0,
          width: 0,
        }}
      />
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
      {isContextMenuOpen && (
        <ContextMenu
          actions={contextMenuActions}
          close={closeContextMenu}
          context={floating.context}
          event={contextMenuEvent ?? undefined}
          isPending={Boolean(
            contextMenuEvent?._id &&
              pendingEventIds.includes(contextMenuEvent._id),
          )}
          onOutsideClick={closeContextMenu}
          ref={floating.refs.setFloating}
          style={floating.context.floatingStyles}
        />
      )}
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
        <DayAllDayEvent
          event={event}
          isPending={Boolean(event._id && pendingEventIds.includes(event._id))}
          isPlaceholder={isDraftOnlyEvent(event, draft, savedEventIds)}
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
        <DayTimedEvent
          deckLayout={deckLayout}
          event={event}
          isPending={Boolean(event._id && pendingEventIds.includes(event._id))}
          isPlaceholder={isDraftOnlyEvent(event, draft, savedEventIds)}
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
  const isDeck = Boolean(deckLayout);
  const [isFocused, setIsFocused] = useState(false);
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
  const deckBoxShadow = (() => {
    if (!isDeck) return undefined;
    const ring = `0 0 0 0.75px ${theme.color.bg.primary}`;
    const drop = isFocused
      ? "0 6px 14px -3px rgba(0,0,0,0.55)"
      : "0 3px 6px -2px rgba(0,0,0,0.4)";
    const highlight = `inset 0 1px 0 rgba(255,255,255,${isFocused ? 0.1 : 0.07})`;
    return `${ring}, ${drop}, ${highlight}`;
  })();
  const shouldFloatAboveDeck = isDeck && isFocused;
  const position = getDayTimedEventPosition({
    deckLayout,
    event,
    isPlaceholder,
    measurements,
    visibleDates,
  });
  const zIndex = shouldFloatAboveDeck
    ? ZIndex.MAX
    : (position.zIndex ?? ZIndex.LAYER_1);

  return (
    <CalendarTimedEventCard
      boxShadow={deckBoxShadow}
      displayMode={isPlaceholder ? "placeholder" : "saved"}
      event={event}
      interactionAttributes={interactionAttributes}
      isPending={isPending}
      motionMode="idle"
      onBlur={isDeck ? () => setIsFocused(false) : undefined}
      onEventKeyDown={onOpenEvent}
      onFocus={isDeck ? () => setIsFocused(true) : undefined}
      onMouseEnter={(mouseEvent) => {
        if (!isRegistered) return;

        setHoveredDayCalendarEventTarget(mouseEvent.currentTarget);
      }}
      onMouseLeave={(mouseEvent) => {
        clearHoveredDayCalendarEventTarget(mouseEvent.currentTarget);
      }}
      position={{ ...position, zIndex }}
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

const getPointerPoint = ({
  clientX,
  clientY,
}: {
  clientX: number;
  clientY: number;
}) => ({
  x: clientX,
  y: clientY,
});

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

const getCalendarEventIdSet = (events: Schema_GridEvent[]) =>
  new Set(events.map((event) => event._id).filter(isString));

const isDraftOnlyEvent = (
  event: Schema_GridEvent,
  draft: Schema_Event | null,
  savedEventIds: Set<string>,
) =>
  Boolean(
    event._id && event._id === draft?._id && !savedEventIds.has(event._id),
  );

const isString = (value: string | undefined): value is string =>
  typeof value === "string";

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
