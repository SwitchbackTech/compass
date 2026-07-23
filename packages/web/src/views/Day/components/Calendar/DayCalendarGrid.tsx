import {
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { type Calendar } from "@core/types/calendar.contracts";
import { type CalendarId } from "@core/types/domain-primitives";
import dayjs from "@core/util/date/dayjs";
import { type GridEvent } from "@web/common/types/web.event.types";
import { onViewCommand } from "@web/common/utils/dom/view-command-bus";
import {
  createAlldayDraft,
  createTimedDraft,
} from "@web/common/utils/draft/draft.util";
import { showErrorToast } from "@web/common/utils/toast/error-toast.util";
import { type GridEventDraft } from "@web/events/event-draft.types";
import { createGridEventDraftFromGridEvent } from "@web/events/grid-event-draft.adapter";
import { useDayEventViewModel } from "@web/events/queries/useDayEventsQuery";
import {
  draftActions,
  selectGridDraft,
  useDraftStore,
} from "@web/events/stores/draft.store";
import { EventGrid } from "@web/grid/components/EventGrid";
import { useAllDayDraftCreation } from "@web/grid/hooks/useAllDayDraftCreation";
import { useGridCoordinates } from "@web/grid/hooks/useGridCoordinates";
import { useGridMeasurements } from "@web/grid/hooks/useGridMeasurements";
import { dayEventQueryRange } from "@web/views/Day/hooks/events/useDayEvents";
import { useDateInView } from "@web/views/Day/hooks/navigation/useDateInView";
import { useDayEventNudgeShortcuts } from "@web/views/Day/hooks/shortcuts/useDayEventNudgeShortcuts";
import { DayInteractionCoordinator } from "@web/views/Day/interaction/DayInteractionCoordinator";
import { DayCalendarBusyPeriodsLayer } from "./DayCalendarBusyPeriods";
import { DayCalendarColumnHeaders } from "./DayCalendarColumnHeaders";
import { useDayCalendarContextMenu } from "./DayCalendarContextMenu";
import {
  DayCalendarAllDayEventsLayer,
  DayCalendarTimedEventsLayer,
} from "./DayCalendarEventLayers";
import { useDayCalendarColumns } from "./useDayCalendarColumns";
import { useDayCalendarScrollToNow } from "./useDayCalendarScrollToNow";
import { useDayTimedDraftCreation } from "./useDayTimedDraftCreation";

export const canCreateDraftOnCalendar = (
  calendar: Calendar | null,
  showError: (message: string) => unknown = showErrorToast,
): boolean => {
  if (!calendar || calendar.capabilities.canWrite) return true;

  showError(`You can't edit the ${calendar.name} calendar.`);
  return false;
};

const isDayInteractionMotionActive = () => false;

export function DayCalendarGrid() {
  const dateInView = useDateInView();
  const today = useMemo(() => dayjs(), []);
  const {
    allDayEvents,
    events: dayEvents,
    isPending: isLoadingEvents,
    rowCount: allDayRowsCount,
    timedEvents,
  } = useDayEventViewModel(dayEventQueryRange(dateInView));
  const {
    calendarColumnIndexById,
    displayedAllDayEvents,
    displayedCalendars,
    displayedTimedEvents,
    getCalendarColumnIndex,
    visibleDates,
  } = useDayCalendarColumns({ allDayEvents, dateInView, timedEvents });
  const { gridRefs, measurements } = useGridMeasurements({
    isInteractionMotionActive: isDayInteractionMotionActive,
    visibleDateCount: visibleDates.length,
  });
  const dateCalcs = useGridCoordinates(
    measurements,
    gridRefs.mainGridRef,
    visibleDates,
  );
  useDayEventNudgeShortcuts({ timedEvents: displayedTimedEvents });
  const gridDraft = useDraftStore(selectGridDraft);

  const calendarColumnKeys = useMemo(
    () => displayedCalendars.map((calendar) => calendar.id),
    [displayedCalendars],
  );
  const getDayInteractionLayoutSources = useCallback(
    () => ({
      allDayColumnsElement: gridRefs.allDayColumnsRef.current,
      mainGridElement: gridRefs.mainGridRef.current,
      timedColumnsElement: gridRefs.timedColumnsRef.current,
    }),
    [gridRefs.allDayColumnsRef, gridRefs.mainGridRef, gridRefs.timedColumnsRef],
  );

  useDayCalendarScrollToNow(gridRefs.mainGridRef);

  const openGridDraftForm = useCallback((draft: GridEventDraft) => {
    draftActions.startGridDraft({ activity: "gridClick", draft });
    draftActions.setFormOpen(true);
  }, []);

  const openEventFormForEvent = useCallback(
    (event: GridEvent) => {
      if (!event._id) {
        return;
      }

      const sourceEvent = dayEvents.find(
        (candidate) => candidate.id === event._id,
      );
      const draft = createGridEventDraftFromGridEvent(event, sourceEvent);
      if (!draft) {
        return;
      }

      openGridDraftForm(draft);
    },
    [dayEvents, openGridDraftForm],
  );

  // timedEvents/allDayEvents are the same GridEvent objects the grid
  // layers render from (assembled once in event.view-model.ts), so the
  // context menu/right-click lookup reuses them directly instead of
  // re-deriving a fresh GridEvent from `dayEvents` (Event[]).
  const dayGridEventsById = useMemo(() => {
    const map = new Map<string, GridEvent>();
    for (const gridEvent of [
      ...displayedTimedEvents,
      ...displayedAllDayEvents,
    ]) {
      if (gridEvent._id) map.set(gridEvent._id, gridEvent);
    }
    return map;
  }, [displayedAllDayEvents, displayedTimedEvents]);

  const getDayEventById = useCallback(
    (eventId: string): GridEvent | null =>
      dayGridEventsById.get(eventId) ?? null,
    [dayGridEventsById],
  );

  const { contextMenu, handleContextMenu } = useDayCalendarContextMenu({
    getDayEventById,
    onOpenEvent: openEventFormForEvent,
  });

  const getAllDayDraftStartDate = (clientX: number) =>
    dateCalcs.getDateStrByXY(clientX, 0, YEAR_MONTH_DAY_FORMAT);

  const openShortcutDraft = useCallback(
    (createDraft: () => void) => {
      if (gridDraft) {
        return;
      }

      createDraft();
      draftActions.setFormOpen(true);
    },
    [gridDraft],
  );

  const createAllDayDraftFromShortcut = useCallback(
    () =>
      openShortcutDraft(() =>
        createAlldayDraft(dateInView, dateInView, "createShortcut"),
      ),
    [dateInView, openShortcutDraft],
  );

  const createTimedDraftFromShortcut = useCallback(
    () =>
      openShortcutDraft(() =>
        createTimedDraft(
          dateInView.isSame(dayjs(), "day"),
          dateInView,
          "createShortcut",
        ),
      ),
    [dateInView, openShortcutDraft],
  );

  // onViewCommand returns its own unsubscribe and emitViewCommand reads the
  // listener set at emit time, so re-subscribing when the handler identity
  // changes is safe — no latest-ref mirror needed.
  useEffect(
    () => onViewCommand("CREATE_ALLDAY_DRAFT", createAllDayDraftFromShortcut),
    [createAllDayDraftFromShortcut],
  );
  useEffect(
    () => onViewCommand("CREATE_TIMED_DRAFT", createTimedDraftFromShortcut),
    [createTimedDraftFromShortcut],
  );
  const onAllDayMouseDown = useAllDayDraftCreation({
    getStartDate: getAllDayDraftStartDate,
    onCreateGridDraft: openGridDraftForm,
  });

  const { startTimedDraftCreation } = useDayTimedDraftCreation({
    dateCalcs,
    onOpenDraft: openGridDraftForm,
  });
  const getCalendarAtX = useCallback(
    (clientX: number) =>
      displayedCalendars[dateCalcs.getVisibleDateIndexByX(clientX)] ?? null,
    [dateCalcs, displayedCalendars],
  );
  const createOnCalendarSurface = useCallback(
    (
      event: ReactMouseEvent<HTMLElement>,
      createDraft: (
        event: ReactMouseEvent<HTMLElement>,
        calendarId: CalendarId | null,
      ) => void,
    ) => {
      const calendar = getCalendarAtX(event.clientX);

      if (!canCreateDraftOnCalendar(calendar)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      createDraft(event, calendar?.id ?? null);
    },
    [getCalendarAtX],
  );
  const handleAllDayMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      createOnCalendarSurface(event, onAllDayMouseDown);
    },
    [createOnCalendarSurface, onAllDayMouseDown],
  );
  const handleTimedMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      createOnCalendarSurface(event, startTimedDraftCreation);
    },
    [createOnCalendarSurface, startTimedDraftCreation],
  );
  const allDayEventsLayer = useMemo(
    () => (
      <DayCalendarAllDayEventsLayer
        events={displayedAllDayEvents}
        getCalendarColumnIndex={getCalendarColumnIndex}
        draft={gridDraft}
        measurements={measurements}
        onOpenEvent={openEventFormForEvent}
        visibleDates={visibleDates}
      />
    ),
    [
      displayedAllDayEvents,
      gridDraft,
      getCalendarColumnIndex,
      measurements,
      openEventFormForEvent,
      visibleDates,
    ],
  );
  const timedEventsLayer = useMemo(
    () => (
      <>
        <DayCalendarBusyPeriodsLayer
          calendarColumnIndexById={calendarColumnIndexById}
          dateInView={dateInView}
          measurements={measurements}
          visibleDates={visibleDates}
        />
        <DayCalendarTimedEventsLayer
          events={displayedTimedEvents}
          getCalendarColumnIndex={getCalendarColumnIndex}
          draft={gridDraft}
          measurements={measurements}
          onOpenEvent={openEventFormForEvent}
          visibleDates={visibleDates}
        />
      </>
    ),
    [
      calendarColumnIndexById,
      dateInView,
      displayedTimedEvents,
      gridDraft,
      getCalendarColumnIndex,
      measurements,
      openEventFormForEvent,
      visibleDates,
    ],
  );

  return (
    <section
      aria-label="Calendar agenda"
      className="flex h-full min-w-xs flex-1 flex-col bg-background px-0.5 pb-0.5"
      onContextMenu={handleContextMenu}
    >
      <DayInteractionCoordinator
        allDayEvents={displayedAllDayEvents}
        calendarColumnKeys={calendarColumnKeys}
        dateInView={dateInView}
        getLayoutSources={getDayInteractionLayoutSources}
        onOpenEvent={openEventFormForEvent}
        timedEvents={displayedTimedEvents}
      >
        {displayedCalendars.length > 0 ? (
          <DayCalendarColumnHeaders calendars={displayedCalendars} />
        ) : null}
        <EventGrid
          allDayEventsLayer={allDayEventsLayer}
          allDayRowsCount={allDayRowsCount}
          gridRefs={gridRefs}
          isLoadingEvents={isLoadingEvents}
          onAllDayMouseDown={handleAllDayMouseDown}
          onTimedMouseDown={handleTimedMouseDown}
          timedEventsLayer={timedEventsLayer}
          today={today}
          visibleDates={visibleDates}
        />
      </DayInteractionCoordinator>
      {contextMenu}
    </section>
  );
}
