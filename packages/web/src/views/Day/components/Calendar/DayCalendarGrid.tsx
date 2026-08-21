import { useCallback, useEffect, useMemo } from "react";
import { shouldShowContextualLoadError } from "@web/api/util/api.util";
import { useConnectGoogle } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle";
import {
  isFirstImportFailed,
  isFirstImportInProgress,
} from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle.util";
import { useCalendarsQuery } from "@web/calendars/calendar.query";
import { useDefaultTargetCalendar } from "@web/calendars/useDefaultTargetCalendar";
import { type GridEvent } from "@web/common/types/web.event.types";
import { onViewCommand } from "@web/common/utils/dom/view-command-bus";
import {
  createAlldayDraft,
  createTimedDraft,
} from "@web/common/utils/draft/draft.util";
import { type GridEventDraft } from "@web/events/event-draft.types";
import {
  createGridEventDraftFromGridEvent,
  getGridDraftId,
} from "@web/events/grid-event-draft.adapter";
import { useDayEventViewModel } from "@web/events/queries/useDayEventsQuery";
import {
  draftActions,
  selectGridDraft,
  useDraftStore,
} from "@web/events/stores/draft.store";
import { EventGrid, isEventGridLoading } from "@web/grid/components/EventGrid";
import { useGridMeasurements } from "@web/grid/hooks/useGridMeasurements";
import { withAllDayColumnTints } from "@web/grid/utils/allDayColumnTint.util";
import { EditSequenceMenu } from "@web/shortcuts/edit-sequence/EditSequenceMenu";
import { ShiftHintOverlay } from "@web/shortcuts/shift-hint/ShiftHintOverlay";
import { dayEventQueryRange } from "@web/views/Day/hooks/events/useDayEvents";
import { useDateInView } from "@web/views/Day/hooks/navigation/useDateInView";
import { useDateNavigation } from "@web/views/Day/hooks/navigation/useDateNavigation";
import { useDayEventNudgeShortcuts } from "@web/views/Day/hooks/shortcuts/useDayEventNudgeShortcuts";
import { useToday } from "@web/views/Week/hooks/useToday";
import { DayCalendarBusyPeriodsLayer } from "./DayCalendarBusyPeriods";
import { DayCalendarColumnHeaders } from "./DayCalendarColumnHeaders";
import { useDayCalendarContextMenu } from "./DayCalendarContextMenu";
import {
  DayCalendarAllDayEventsLayer,
  DayCalendarTimedEventsLayer,
} from "./DayCalendarEventLayers";
import { assignDayAllDayEventRows } from "./dayAllDayRows.util";
import {
  addVisibleDraftEvent,
  getCalendarEventIdSet,
} from "./dayCalendarDraft.util";
import { useDayCalendarColumns } from "./useDayCalendarColumns";
import { useDayCalendarScrollToNow } from "./useDayCalendarScrollToNow";

export function DayCalendarGrid() {
  const dateInView = useDateInView();
  const { navigateToDate } = useDateNavigation();
  const { today } = useToday();
  const { data: calendars = [], isPending: isCalendarsPending } =
    useCalendarsQuery();
  // Seed shortcuts with the form's default create target, not day-column order.
  const defaultTargetCalendarId =
    useDefaultTargetCalendar(calendars)?.id ?? null;
  const {
    allDayEvents,
    error: eventsError,
    events: dayEvents,
    isError: isErrorEvents,
    isFetching,
    isPending,
    refetch,
    timedEvents,
  } = useDayEventViewModel(dayEventQueryRange(dateInView));
  // Session expiry already surfaces SessionExpiredToast — don't also show
  // "Couldn't load events" / Retry for the same failure.
  const showEventsLoadError = shouldShowContextualLoadError(
    isErrorEvents,
    eventsError,
  );
  const isLoadingEvents = isEventGridLoading(
    isPending,
    showEventsLoadError,
    isFetching,
  );
  const { connection, refresh, state: googleState } = useConnectGoogle();
  // See Grid.tsx's Week-view equivalent: googleState alone can't tell a
  // first-ever import apart from routine catch-up on an established account.
  const isImportingEmpty =
    !isPending &&
    !showEventsLoadError &&
    dayEvents.length === 0 &&
    googleState === "IMPORTING" &&
    isFirstImportInProgress(connection);
  const isImportFailed =
    !isPending &&
    !showEventsLoadError &&
    dayEvents.length === 0 &&
    isFirstImportFailed(connection);
  const {
    calendarColumnIndexById,
    displayedAllDayEvents,
    displayedCalendars,
    displayedTimedEvents,
    getCalendarColumnIndex,
    isDisplayedEvent,
    visibleDates,
  } = useDayCalendarColumns({ allDayEvents, dateInView, timedEvents });
  const { gridRefs, measurements } = useGridMeasurements({
    visibleDateCount: visibleDates.length,
  });
  const gridDraft = useDraftStore(selectGridDraft);
  // Strip height must include the all-day draft: layer rendering used to
  // re-stack with the draft while EventGrid still sized from saved events only.
  const savedAllDayEventIds = useMemo(
    () => getCalendarEventIdSet(displayedAllDayEvents),
    [displayedAllDayEvents],
  );
  const { allDayEvents: renderedAllDayEvents, rowsCount: allDayRowsCount } =
    useMemo(() => {
      const withDraft = addVisibleDraftEvent({
        draft: gridDraft,
        events: displayedAllDayEvents,
        isAllDay: true,
        visibleDates,
      }).filter(isDisplayedEvent);
      return assignDayAllDayEventRows(withDraft, getCalendarColumnIndex);
    }, [
      displayedAllDayEvents,
      getCalendarColumnIndex,
      gridDraft,
      isDisplayedEvent,
      visibleDates,
    ]);

  const tintedVisibleDates = useMemo(
    () => withAllDayColumnTints(visibleDates, renderedAllDayEvents, "calendar"),
    [renderedAllDayEvents, visibleDates],
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

      const currentDraft = useDraftStore.getState().gridDraft;
      if (currentDraft && getGridDraftId(currentDraft) === event._id) {
        // Form-closed place-create (and other live drafts): open details
        // without reseeding the draft from the card.
        draftActions.setFormOpen(true);
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

  const openShortcutDraft = useCallback(
    (createDraft: () => void, openForm = true) => {
      if (gridDraft) {
        return;
      }
      // Avoid locking in calendarId: null while the calendars query is still
      // loading; the form would show the default once data arrives.
      if (isCalendarsPending && !defaultTargetCalendarId) {
        return;
      }

      createDraft();
      if (openForm) {
        draftActions.setFormOpen(true);
      }
    },
    [defaultTargetCalendarId, gridDraft, isCalendarsPending],
  );

  const createAllDayDraftFromShortcut = useCallback(
    () =>
      openShortcutDraft(() =>
        createAlldayDraft(
          dateInView,
          dateInView,
          "createShortcut",
          defaultTargetCalendarId,
        ),
      ),
    [dateInView, defaultTargetCalendarId, openShortcutDraft],
  );

  const createTimedDraftFromShortcut = useCallback(
    () =>
      openShortcutDraft(() =>
        createTimedDraft(
          dateInView.isSame(today, "day"),
          dateInView,
          "createShortcut",
          defaultTargetCalendarId,
        ),
      ),
    [dateInView, defaultTargetCalendarId, openShortcutDraft, today],
  );

  // Form stays closed so Shift+Arrow can keep repositioning; Enter opens it.
  // Existing-draft / focus guards also live in useGridEventEditShortcuts.
  const placeTimedDraftFromShortcut = useCallback(
    () =>
      openShortcutDraft(
        () =>
          createTimedDraft(
            dateInView.isSame(today, "day"),
            dateInView,
            "keyboardPlace",
            defaultTargetCalendarId,
          ),
        false,
      ),
    [dateInView, defaultTargetCalendarId, openShortcutDraft, today],
  );
  const { getEditSequenceAnchor, shiftHints } = useDayEventNudgeShortcuts({
    allDayEvents: displayedAllDayEvents,
    navigateToDate,
    placeTimedDraft: placeTimedDraftFromShortcut,
    timedEvents: displayedTimedEvents,
  });

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
  const allDayEventsLayer = useMemo(
    () => (
      <DayCalendarAllDayEventsLayer
        events={renderedAllDayEvents}
        getCalendarColumnIndex={getCalendarColumnIndex}
        draft={gridDraft}
        measurements={measurements}
        onOpenEvent={openEventFormForEvent}
        savedEventIds={savedAllDayEventIds}
        visibleDates={visibleDates}
      />
    ),
    [
      getCalendarColumnIndex,
      gridDraft,
      measurements,
      openEventFormForEvent,
      renderedAllDayEvents,
      savedAllDayEventIds,
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
          isDisplayedEvent={isDisplayedEvent}
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
      isDisplayedEvent,
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
      <DayCalendarColumnHeaders calendars={displayedCalendars} />
      <EventGrid
        allDayEventsLayer={allDayEventsLayer}
        allDayRowsCount={allDayRowsCount}
        gridRefs={gridRefs}
        isErrorEvents={showEventsLoadError}
        isImportFailed={isImportFailed}
        isImportingEmpty={isImportingEmpty}
        isLoadingEvents={isLoadingEvents}
        onRetryEvents={() => void refetch()}
        onRetryImport={() => refresh()}
        timedEventsLayer={timedEventsLayer}
        today={today}
        visibleDates={tintedVisibleDates}
      />
      {contextMenu}
      <ShiftHintOverlay hints={shiftHints} />
      <EditSequenceMenu getAnchor={getEditSequenceAnchor} />
    </section>
  );
}
