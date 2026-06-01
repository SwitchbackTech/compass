import { useDismiss, useInteractions } from "@floating-ui/react";
import {
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { Categories_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { CALENDAR_TIMED_VISIBLE_HOURS } from "@web/common/calendar-grid/calendarGrid.constants";
import { CalendarGrid } from "@web/common/calendar-grid/components/CalendarGrid";
import { useCalendarDateCalcs } from "@web/common/calendar-grid/hooks/useCalendarDateCalcs";
import { useCalendarGridLayout } from "@web/common/calendar-grid/hooks/useCalendarGridLayout";
import { useFloatingAtCursor } from "@web/common/hooks/useFloatingAtCursor";
import {
  CursorItem,
  closeFloatingAtCursor,
  nodeId$,
  openFloatingAtCursor,
} from "@web/common/hooks/useOpenAtCursor";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import {
  CompassDOMEvents,
  compassEventEmitter,
} from "@web/common/utils/dom/event-emitter.util";
import {
  addId,
  assembleDefaultEvent,
  assembleGridEvent,
  type EventWithDates,
  getCalendarEventElementFromGrid,
  hasEventDates,
} from "@web/common/utils/event/event.util";
import { getCurrentMinute } from "@web/common/utils/grid/grid.util";
import { isRightClick } from "@web/common/utils/mouse/mouse.util";
import { FloatingEventForm } from "@web/components/FloatingEventForm/FloatingEventForm";
import { selectDraft } from "@web/ducks/events/selectors/draft.selectors";
import {
  selectDayEvents,
  selectDayRowCount,
} from "@web/ducks/events/selectors/event.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { useDateInView } from "@web/views/Day/hooks/navigation/useDateInView";
import { DayInteractionCoordinator } from "@web/views/Day/interaction/DayInteractionCoordinator";
import {
  type DayInteractionEventType,
  dayCalendarEventRegistry,
} from "@web/views/Day/interaction/registry/dayCalendarEventRegistry";
import { useDayCalendarContextMenu } from "./DayCalendarContextMenu";
import {
  DayCalendarAllDayEventsLayer,
  DayCalendarTimedEventsLayer,
} from "./DayCalendarEventLayers";
import { useDayTimedDraftCreation } from "./useDayTimedDraftCreation";

const isDayInteractionMotionActive = () => false;

export function DayCalendarGrid() {
  const dispatch = useAppDispatch();
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
  const draft = useAppSelector(selectDraft);
  const allDayCreationPressTargetRef = useRef<HTMLElement | null>(null);
  const floating = useFloatingAtCursor((open, _event, reason) => {
    const dismissed = reason === "escape-key" || reason === "outside-press";

    if (!open && dismissed && nodeId$.getValue() === CursorItem.EventForm) {
      dispatch(draftSlice.actions.discard(undefined));
    }
  });
  const shouldDismissEventForm = useCallback((event: MouseEvent) => {
    const allDayCreationPressTarget = allDayCreationPressTargetRef.current;

    if (!allDayCreationPressTarget) {
      return true;
    }

    allDayCreationPressTargetRef.current = null;

    const target = event.target;

    return !(
      target instanceof Node && allDayCreationPressTarget.contains(target)
    );
  }, []);
  const dismiss = useDismiss(floating.context, {
    enabled: true,
    outsidePress: shouldDismissEventForm,
    outsidePressEvent: "click",
  });
  const interactions = useInteractions([dismiss]);

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
  const scrollToNowRef = useRef(scrollToNow);

  useEffect(() => {
    if (!gridRefs.mainGridRef.current) {
      return;
    }

    scrollToNow();
  }, [gridRefs.mainGridRef, scrollToNow]);

  useEffect(() => {
    scrollToNowRef.current = scrollToNow;
  }, [scrollToNow]);

  useEffect(() => {
    const handleScrollToNowLine = () => {
      scrollToNowRef.current();
    };

    compassEventEmitter.on(
      CompassDOMEvents.SCROLL_TO_NOW_LINE,
      handleScrollToNowLine,
    );

    return () => {
      compassEventEmitter.off(
        CompassDOMEvents.SCROLL_TO_NOW_LINE,
        handleScrollToNowLine,
      );
    };
  }, []);

  const openEventFormForEvent = useCallback(
    (event: Schema_GridEvent) => {
      if (!event._id) {
        return;
      }

      dispatch(draftSlice.actions.startGridClick({ ...event, _id: event._id }));

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
    },
    [dispatch],
  );

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

  const { anchorElement, contextMenu, handleContextMenu } =
    useDayCalendarContextMenu({
      floating,
      getDayEventById,
      onOpenEvent: openEventFormForEvent,
    });

  const onAllDayMouseDown = useCallback(
    async (event: ReactMouseEvent<HTMLElement>) => {
      if (isRightClick(event)) {
        return;
      }

      const allDayCreationPressTarget = event.currentTarget;

      if (draft) {
        allDayCreationPressTargetRef.current = null;
        dispatch(draftSlice.actions.discard(undefined));
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

      allDayCreationPressTargetRef.current = allDayCreationPressTarget;
      openEventFormForEvent(
        addId(assembleGridEvent(draftEvent as EventWithDates)),
      );
    },
    [
      dateCalcs,
      dateInView,
      dispatch,
      draft,
      openEventFormForEvent,
      visibleDates,
    ],
  );

  const { startTimedDraftCreation } = useDayTimedDraftCreation({
    dateCalcs,
    draft,
    onOpenEvent: openEventFormForEvent,
  });
  const allDayEventsLayer = useMemo(
    () => (
      <DayCalendarAllDayEventsLayer
        draft={draft}
        measurements={measurements}
        onOpenEvent={openEventFormForEvent}
        visibleDates={visibleDates}
      />
    ),
    [draft, measurements, openEventFormForEvent, visibleDates],
  );
  const timedEventsLayer = useMemo(
    () => (
      <DayCalendarTimedEventsLayer
        draft={draft}
        measurements={measurements}
        onOpenEvent={openEventFormForEvent}
        visibleDates={visibleDates}
      />
    ),
    [draft, measurements, openEventFormForEvent, visibleDates],
  );

  return (
    <section
      aria-label="Calendar agenda"
      className="flex h-full min-w-xs flex-1 flex-col bg-bg-primary px-0.5 pb-0.5"
      onContextMenu={handleContextMenu}
    >
      {anchorElement}
      <DayInteractionCoordinator
        dateInView={dateInView}
        getLayoutSources={getDayInteractionLayoutSources}
      >
        <CalendarGrid
          allDayEventsLayer={allDayEventsLayer}
          allDayRowsCount={allDayRowsCount}
          gridRefs={gridRefs}
          onAllDayMouseDown={onAllDayMouseDown}
          onTimedMouseDown={startTimedDraftCreation}
          timedEventsLayer={timedEventsLayer}
          today={today}
          visibleDates={visibleDates}
        />
      </DayInteractionCoordinator>
      {contextMenu}
      <FloatingEventForm floating={floating} interactions={interactions} />
    </section>
  );
}

const getDayInteractionEventType = (
  event: Schema_GridEvent,
): DayInteractionEventType => (event.isAllDay ? "all-day" : "timed");
