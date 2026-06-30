import { type OpenChangeReason, type VirtualElement } from "@floating-ui/react";
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
import {
  selectDraft,
  selectIsEventFormOpen,
} from "@web/ducks/events/selectors/draft.selectors";
import {
  selectDayEvents,
  selectDayRowCount,
} from "@web/ducks/events/selectors/event.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { useDateInView } from "@web/views/Day/hooks/navigation/useDateInView";
import { DayInteractionCoordinator } from "@web/views/Day/interaction/DayInteractionCoordinator";
import {
  type EventFormProps,
  useEventForm,
} from "@web/views/Forms/hooks/useEventForm";
import { useDayCalendarContextMenu } from "./DayCalendarContextMenu";
import {
  DayCalendarAllDayEventsLayer,
  DayCalendarTimedEventsLayer,
} from "./DayCalendarEventLayers";
import { useDayTimedDraftCreation } from "./useDayTimedDraftCreation";

const isDayInteractionMotionActive = () => false;

const createEventFormAnchor = (eventId: string): VirtualElement => {
  const getEventElement = () => getCalendarEventElementFromGrid(eventId);

  return {
    getBoundingClientRect: () =>
      getEventElement()?.getBoundingClientRect() ?? new DOMRect(),
    get contextElement() {
      return getEventElement() ?? undefined;
    },
  };
};

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
  const isFormOpen = useAppSelector(selectIsEventFormOpen);
  const draftCategory = draft?.isAllDay
    ? Categories_Event.ALLDAY
    : Categories_Event.TIMED;
  const handleFormOpenChange = useCallback(
    (open: boolean, _event: Event, reason?: OpenChangeReason) => {
      const dismissed = reason === "escape-key" || reason === "outside-press";

      if (!open && dismissed) {
        dispatch(draftSlice.actions.discard(undefined));
      }
    },
    [dispatch],
  );
  const form: EventFormProps = useEventForm(
    draftCategory,
    isFormOpen,
    handleFormOpenChange,
  );
  const setFormPositionReference = form.refs.setPositionReference;
  const setFormReference = form.refs.setReference;

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

      const eventElement = getCalendarEventElementFromGrid(event._id);
      setFormReference(eventElement);
      setFormPositionReference(createEventFormAnchor(event._id));
      dispatch(draftSlice.actions.startGridClick({ ...event, _id: event._id }));
      dispatch(draftSlice.actions.setFormOpen(true));
    },
    [dispatch, setFormPositionReference, setFormReference],
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

  const { contextMenu, handleContextMenu } = useDayCalendarContextMenu({
    getDayEventById,
    onOpenEvent: openEventFormForEvent,
  });

  const onAllDayMouseDown = useCallback(
    async (event: ReactMouseEvent<HTMLElement>) => {
      if (isRightClick(event)) {
        return;
      }

      if (draft) {
        dispatch(draftSlice.actions.discard(undefined));
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
      <DayInteractionCoordinator
        dateInView={dateInView}
        getLayoutSources={getDayInteractionLayoutSources}
        onOpenEvent={openEventFormForEvent}
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
      <FloatingEventForm form={form} />
    </section>
  );
}
