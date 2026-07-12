import { type OpenChangeReason, type VirtualElement } from "@floating-ui/react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { Categories_Event, type Schema_Event } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import {
  CompassDOMEvents,
  compassEventEmitter,
} from "@web/common/utils/dom/event-emitter.util";
import {
  addId,
  assembleDefaultEvent,
  assembleGridEvent,
  getCalendarEventElementFromGrid,
  hasEventDates,
} from "@web/common/utils/event/event.util";
import { getCurrentMinute } from "@web/common/utils/grid/grid.util";
import { FloatingEventForm } from "@web/components/FloatingEventForm/FloatingEventForm";
import {
  createGridEventDraft,
  editGridEventDraft,
  timedGridSchedule,
} from "@web/events/grid-event-draft.adapter";
import { useDayEventViewModel } from "@web/events/queries/useDayEventsQuery";
import {
  draftActions,
  selectDraft,
  selectIsEventFormOpen,
  useDraftStore,
} from "@web/events/stores/draft.store";
import { CALENDAR_TIMED_VISIBLE_HOURS } from "@web/layout/calendar-grid/calendarGrid.constants";
import { CalendarGrid } from "@web/layout/calendar-grid/components/CalendarGrid";
import { useAllDayDraftCreation } from "@web/layout/calendar-grid/hooks/useAllDayDraftCreation";
import { useCalendarDateCalcs } from "@web/layout/calendar-grid/hooks/useCalendarDateCalcs";
import { useCalendarGridLayout } from "@web/layout/calendar-grid/hooks/useCalendarGridLayout";
import { useDateInView } from "@web/views/Day/hooks/navigation/useDateInView";
import { useDayEventNudgeShortcuts } from "@web/views/Day/hooks/shortcuts/useDayEventNudgeShortcuts";
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
  const {
    allDayEvents,
    events: dayEvents,
    rowCount: allDayRowsCount,
    timedEvents,
  } = useDayEventViewModel({
    startDate: dateInView.startOf("day").utc(true).format(),
    endDate: dateInView.endOf("day").utc(true).format(),
  });
  useDayEventNudgeShortcuts({ timedEvents });
  const draft = useDraftStore(selectDraft);
  const isFormOpen = useDraftStore(selectIsEventFormOpen);
  const draftCategory = draft?.isAllDay
    ? Categories_Event.ALLDAY
    : Categories_Event.TIMED;
  const handleFormOpenChange = useCallback(
    (open: boolean, _event: Event, reason?: OpenChangeReason) => {
      const dismissed = reason === "escape-key" || reason === "outside-press";

      if (!open && dismissed) {
        draftActions.discard();
      }
    },
    [],
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

      const sourceEvent = dayEvents.find(
        (candidate) => candidate.id === event._id,
      );
      const draft = sourceEvent
        ? editGridEventDraft(sourceEvent)
        : createGridEventDraft(
            event.isAllDay
              ? {
                  kind: "allDay",
                  start: new Date(event.startDate),
                  end: new Date(event.endDate),
                }
              : timedGridSchedule(
                  new Date(event.startDate),
                  new Date(event.endDate),
                ),
          );
      if (!draft) {
        return;
      }

      draftActions.startGridDraft({ activity: "gridClick", draft });
      draftActions.setFormOpen(true);
    },
    [dayEvents, setFormPositionReference, setFormReference],
  );

  // timedEvents/allDayEvents are the same Schema_GridEvent objects the grid
  // layers render from (assembled once in event.view-model.ts), so the
  // context menu/right-click lookup reuses them directly instead of
  // re-deriving a fresh Schema_GridEvent from `dayEvents` (Event[]).
  const dayGridEventsById = useMemo(() => {
    const map = new Map<string, Schema_GridEvent>();
    for (const gridEvent of [...timedEvents, ...allDayEvents]) {
      if (gridEvent._id) map.set(gridEvent._id, gridEvent);
    }
    return map;
  }, [timedEvents, allDayEvents]);

  const getDayEventById = useCallback(
    (eventId: string): Schema_GridEvent | null =>
      dayGridEventsById.get(eventId) ?? null,
    [dayGridEventsById],
  );

  const { contextMenu, handleContextMenu } = useDayCalendarContextMenu({
    getDayEventById,
    onOpenEvent: openEventFormForEvent,
  });

  const getAllDayDraftStartDate = (clientX: number) =>
    dateCalcs.getDateStrByXY(clientX, 0, YEAR_MONTH_DAY_FORMAT);
  const openAllDayDraft = useCallback(
    (event: Schema_Event) => {
      if (!hasEventDates(event)) {
        return;
      }

      openEventFormForEvent(addId(assembleGridEvent(event)));
    },
    [openEventFormForEvent],
  );

  const createAllDayDraftFromShortcut = useCallback(() => {
    if (draft) {
      return;
    }

    const startDate = dateInView.format(YEAR_MONTH_DAY_FORMAT);
    const endDate = dateInView.add(1, "day").format(YEAR_MONTH_DAY_FORMAT);

    void assembleDefaultEvent(Categories_Event.ALLDAY, startDate, endDate).then(
      openAllDayDraft,
    );
  }, [dateInView, draft, openAllDayDraft]);
  const createAllDayDraftRef = useRef(createAllDayDraftFromShortcut);

  useEffect(() => {
    createAllDayDraftRef.current = createAllDayDraftFromShortcut;
  }, [createAllDayDraftFromShortcut]);

  useEffect(() => {
    const handleCreateAllDayDraft = () => {
      createAllDayDraftRef.current();
    };

    compassEventEmitter.on(
      CompassDOMEvents.CREATE_ALLDAY_DRAFT,
      handleCreateAllDayDraft,
    );

    return () => {
      compassEventEmitter.off(
        CompassDOMEvents.CREATE_ALLDAY_DRAFT,
        handleCreateAllDayDraft,
      );
    };
  }, []);
  const onAllDayMouseDown = useAllDayDraftCreation({
    getStartDate: getAllDayDraftStartDate,
    onCreateDraft: openAllDayDraft,
  });

  const { startTimedDraftCreation } = useDayTimedDraftCreation({
    dateCalcs,
    draft,
    onOpenEvent: openEventFormForEvent,
  });
  const allDayEventsLayer = useMemo(
    () => (
      <DayCalendarAllDayEventsLayer
        events={allDayEvents}
        draft={draft}
        measurements={measurements}
        onOpenEvent={openEventFormForEvent}
        visibleDates={visibleDates}
      />
    ),
    [allDayEvents, draft, measurements, openEventFormForEvent, visibleDates],
  );
  const timedEventsLayer = useMemo(
    () => (
      <DayCalendarTimedEventsLayer
        events={timedEvents}
        draft={draft}
        measurements={measurements}
        onOpenEvent={openEventFormForEvent}
        visibleDates={visibleDates}
      />
    ),
    [draft, measurements, openEventFormForEvent, timedEvents, visibleDates],
  );

  return (
    <section
      aria-label="Calendar agenda"
      className="flex h-full min-w-xs flex-1 flex-col bg-bg-primary px-0.5 pb-0.5"
      onContextMenu={handleContextMenu}
    >
      <DayInteractionCoordinator
        allDayEvents={allDayEvents}
        dateInView={dateInView}
        getLayoutSources={getDayInteractionLayoutSources}
        onOpenEvent={openEventFormForEvent}
        timedEvents={timedEvents}
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
