import { useCallback, useEffect, useRef } from "react";
import { type Dayjs } from "@core/util/date/dayjs";
import { useCalendarsQuery } from "@web/calendars/calendar.query";
import { useDefaultTargetCalendar } from "@web/calendars/useDefaultTargetCalendar";
import { onViewCommand } from "@web/common/utils/dom/view-command-bus";
import {
  createAlldayDraft,
  createTimedDraft,
} from "@web/common/utils/draft/draft.util";
import { focusCalendarEventElement } from "@web/common/utils/event/event.util";
import { useFocusSidebarShortcut } from "@web/components/Sidebar/useFocusSidebarShortcut";
import { useWeekEventViewModel } from "@web/events/queries/useWeekEventsQuery";
import { draftActions, isEventFormOpen } from "@web/events/stores/draft.store";
import { useCalendarViewShortcuts } from "@web/grid/shortcuts/useCalendarViewShortcuts";
import { useGridEventEditShortcuts } from "@web/grid/shortcuts/useGridEventEditShortcuts";
import { useGridEventFormFieldSequences } from "@web/grid/shortcuts/useGridEventFormFieldSequences";
import {
  type ActiveShiftHint,
  useShiftHoldEventHints,
} from "@web/shortcuts/shift-hint/useShiftHoldEventHints";
import { useDraftContext } from "@web/views/Week/components/Draft/context/useDraftContext";
import { type Util_Scroll } from "@web/views/Week/hooks/grid/useScroll";
import { goToTodayInWeek } from "@web/views/Week/hooks/shortcuts/weekShortcuts.util";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { weekEventTargeting } from "@web/views/Week/interaction/targeting/week-event.targeting";

export interface ShortcutProps {
  isCurrentWeek: boolean;
  queryEndOfView: Dayjs;
  queryStartOfView: Dayjs;
  startOfView: Dayjs;
  endOfView: Dayjs;
  weekDays: Dayjs[];
  util: WeekProps["util"];
  scrollUtil: Util_Scroll;
}

/**
 * Week shortcut owner: draft create/nav/focus behavior + bus subscription,
 * then thin key registration via `useCalendarViewShortcuts`.
 */
export const useWeekShortcutOwner = ({
  isCurrentWeek,
  queryEndOfView,
  queryStartOfView,
  startOfView,
  endOfView,
  weekDays,
  util,
  scrollUtil,
}: ShortcutProps): {
  getEditSequenceAnchor: () => HTMLElement | null;
  shiftHints: ActiveShiftHint[];
} => {
  const { data: calendars = [], isPending: isCalendarsPending } =
    useCalendarsQuery();
  const defaultTargetCalendarId =
    useDefaultTargetCalendar(calendars)?.id ?? null;
  const {
    actions: { repositionDraftByKeyboard },
  } = useDraftContext();

  const { allDayEvents, timedEvents } = useWeekEventViewModel({
    startOfView: queryStartOfView,
    endOfView: queryEndOfView,
  });
  const { decrementWeek, incrementWeek, goToToday, shiftViewByDay } = util;
  const { scrollToNow } = scrollUtil;

  const discardDraft = useCallback(() => {
    if (isEventFormOpen()) {
      draftActions.discard();
    }
  }, []);

  const goToPreviousWeek = useCallback(() => {
    discardDraft();
    decrementWeek();
  }, [decrementWeek, discardDraft]);

  const toToday = useCallback(() => {
    goToTodayInWeek({ scrollToNow, goToToday });
  }, [scrollToNow, goToToday]);

  const goToNextWeek = useCallback(() => {
    discardDraft();
    incrementWeek();
  }, [incrementWeek, discardDraft]);

  const shiftViewBackward = useCallback(() => {
    discardDraft();
    shiftViewByDay(-1);
  }, [discardDraft, shiftViewByDay]);

  const shiftViewForward = useCallback(() => {
    discardDraft();
    shiftViewByDay(1);
  }, [discardDraft, shiftViewByDay]);

  // Same guard as DayCalendarGrid.openShortcutDraft: do not seed a sticky
  // null calendarId while calendars are still loading.
  const canSeedDraft = !isCalendarsPending || Boolean(defaultTargetCalendarId);

  const createAllDayDraftEvent = useCallback(() => {
    if (!canSeedDraft) return;

    void createAlldayDraft(
      startOfView,
      endOfView,
      "createShortcut",
      defaultTargetCalendarId,
    );
  }, [canSeedDraft, defaultTargetCalendarId, endOfView, startOfView]);

  const createTimedDraftEvent = useCallback(() => {
    if (!canSeedDraft) return;

    void createTimedDraft(
      isCurrentWeek,
      startOfView,
      "createShortcut",
      defaultTargetCalendarId,
    );
  }, [canSeedDraft, defaultTargetCalendarId, isCurrentWeek, startOfView]);

  // Idle Shift+Arrow place-create. Existing-draft / focused-target guards live
  // in useGridEventEditShortcuts so a failed clamp/midnight move never reseeds.
  const placeTimedDraftEvent = useCallback(() => {
    if (!canSeedDraft) return;

    void createTimedDraft(
      isCurrentWeek,
      startOfView,
      "keyboardPlace",
      defaultTargetCalendarId,
    );
  }, [canSeedDraft, defaultTargetCalendarId, isCurrentWeek, startOfView]);

  // The command palette's create-event rows (event.cmd.constants.ts) can only
  // reach this view through the bus; the "C"/"A" keys below call the create
  // functions directly. Resubscribes when the create handlers change (week in
  // view or default target calendar).
  useEffect(() => {
    const unsubscribeCreateAllDayDraft = onViewCommand(
      "CREATE_ALLDAY_DRAFT",
      createAllDayDraftEvent,
    );
    const unsubscribeCreateTimedDraft = onViewCommand(
      "CREATE_TIMED_DRAFT",
      createTimedDraftEvent,
    );

    return () => {
      unsubscribeCreateAllDayDraft();
      unsubscribeCreateTimedDraft();
    };
  }, [createAllDayDraftEvent, createTimedDraftEvent]);

  useFocusSidebarShortcut();

  const focusFirstCalendarEvent = useCallback(() => {
    const target = weekEventTargeting.getFirstVisibleGridEventTarget();
    if (!target) return;

    weekEventTargeting.focusGridEventTarget(target);
  }, []);

  const targeting = {
    focus: weekEventTargeting.focusGridEventTarget,
    getFocused: weekEventTargeting.getFocusedGridEventTarget,
    listVisible: weekEventTargeting.listVisibleGridEventTargets,
  };

  // Set when a Shift+Arrow nudge carried an event across the window edge;
  // consumed once the shifted window's weekDays land so focus restoration
  // targets the post-shift card rather than a node the shift is about to
  // replace.
  const pendingCarryFocusIdRef = useRef<string | null>(null);
  useEffect(() => {
    const eventId = pendingCarryFocusIdRef.current;
    if (!eventId) return;
    pendingCarryFocusIdRef.current = null;
    focusCalendarEventElement(eventId);
  }, [weekDays]);

  useGridEventEditShortcuts({
    allDayEvents,
    timedEvents,
    dayBoundary: {
      kind: "clamp",
      weekDays,
      // Shift+Arrow at the window edge carries the event: the nudge commits
      // and the view slides one day to keep it on screen. Raw shiftViewByDay
      // (not shiftViewForward/Backward) so the carried event's optimistic
      // update isn't discarded with the draft. Focus restoration waits for
      // the shifted window to render (the weekDays effect below) - the
      // nudge's own refocus retries run against the pre-shift DOM.
      onCrossed: (days, eventId) => {
        pendingCarryFocusIdRef.current = eventId;
        shiftViewByDay(days);
      },
    },
    targeting,
    placeTimedDraft: placeTimedDraftEvent,
    repositionDraftByKey: repositionDraftByKeyboard,
  });

  const { getMenuAnchor: getEditSequenceAnchor } =
    useGridEventFormFieldSequences({
      allDayEvents,
      targeting,
      timedEvents,
    });

  useCalendarViewShortcuts({
    onPrevPeriod: goToPreviousWeek,
    onNextPeriod: goToNextWeek,
    onShiftViewBackward: shiftViewBackward,
    onShiftViewForward: shiftViewForward,
    onGoToToday: toToday,
    onCreateAllDayEvent: createAllDayDraftEvent,
    onCreateTimedEvent: createTimedDraftEvent,
    onFocusCalendar: focusFirstCalendarEvent,
  });

  const { hints: shiftHints } = useShiftHoldEventHints({
    allDayEvents,
    focus: targeting.focus,
    listVisible: targeting.listVisible,
    mode: "week",
    timedEvents,
  });

  return { getEditSequenceAnchor, shiftHints };
};
