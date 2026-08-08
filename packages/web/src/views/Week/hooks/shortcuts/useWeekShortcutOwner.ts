import { useCallback, useEffect } from "react";
import { type Dayjs } from "@core/util/date/dayjs";
import { useCalendarsQuery } from "@web/calendars/calendar.query";
import { useDefaultTargetCalendar } from "@web/calendars/useDefaultTargetCalendar";
import {
  emitViewCommand,
  onViewCommand,
} from "@web/common/utils/dom/view-command-bus";
import {
  createAlldayDraft,
  createTimedDraft,
} from "@web/common/utils/draft/draft.util";
import { isEditableKeyboardTarget } from "@web/common/utils/form/form.util";
import { useFocusSidebarShortcut } from "@web/components/Sidebar/useFocusSidebarShortcut";
import { useWeekEventViewModel } from "@web/events/queries/useWeekEventsQuery";
import { useRecurrenceScopeOpportunityStore } from "@web/events/recurrence/recurrence-scope-opportunity.store";
import { draftActions, isEventFormOpen } from "@web/events/stores/draft.store";
import { getFirstEventOnWeekdayColumn } from "@web/grid/shortcuts/focus-adjacent-grid-event";
import { useGridEventEditShortcuts } from "@web/grid/shortcuts/useGridEventEditShortcuts";
import { useGridEventFormFieldSequences } from "@web/grid/shortcuts/useGridEventFormFieldSequences";
import { useDraftContext } from "@web/views/Week/components/Draft/context/useDraftContext";
import { type Util_Scroll } from "@web/views/Week/hooks/grid/useScroll";
import { useWeekViewShortcuts } from "@web/views/Week/hooks/shortcuts/useWeekViewShortcuts";
import { goToTodayInWeek } from "@web/views/Week/hooks/shortcuts/weekShortcuts.util";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import {
  focusWeekGridEventTarget,
  getFirstVisibleWeekGridEventTarget,
  getFocusedWeekGridEventTarget,
  listVisibleWeekGridEventTargets,
} from "@web/views/Week/interaction/targeting/week-event.targeting";

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
 * then thin key registration via `useWeekViewShortcuts`.
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
}: ShortcutProps) => {
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

  const createAllDayDraftEvent = useCallback(() => {
    // Same guard as DayCalendarGrid.openShortcutDraft: do not seed a sticky
    // null calendarId while calendars are still loading.
    if (isCalendarsPending && !defaultTargetCalendarId) {
      return;
    }

    void createAlldayDraft(
      startOfView,
      endOfView,
      "createShortcut",
      defaultTargetCalendarId,
    );
  }, [defaultTargetCalendarId, endOfView, isCalendarsPending, startOfView]);

  const createTimedDraftEvent = useCallback(() => {
    if (isCalendarsPending && !defaultTargetCalendarId) {
      return;
    }

    void createTimedDraft(
      isCurrentWeek,
      startOfView,
      "createShortcut",
      defaultTargetCalendarId,
    );
  }, [defaultTargetCalendarId, isCalendarsPending, isCurrentWeek, startOfView]);

  const emitCreateAllDayDraft = useCallback(
    () => emitViewCommand("CREATE_ALLDAY_DRAFT"),
    [],
  );
  const emitCreateTimedDraft = useCallback(
    () => emitViewCommand("CREATE_TIMED_DRAFT"),
    [],
  );

  // The "C"/"A" keys and the command palette's create-event rows
  // (event.cmd.constants.ts) both just emit these commands; this effect is
  // the one place that turns them into a draft, so every trigger runs
  // identical code. Resubscribes when the create handlers change (week in
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
    const target = getFirstVisibleWeekGridEventTarget();
    if (!target) return;

    focusWeekGridEventTarget(target);
  }, []);

  const targeting = {
    focus: focusWeekGridEventTarget,
    getFocused: getFocusedWeekGridEventTarget,
    listVisible: listVisibleWeekGridEventTargets,
  };

  const focusWeekdayColumn = useCallback(
    (columnIndex: number, keyboardEvent: KeyboardEvent) => {
      // Recurrence toast owns digits 1/2 while ready; don't steal them.
      const opportunity =
        useRecurrenceScopeOpportunityStore.getState().opportunity;
      if (opportunity?.status === "ready") return false;

      if (isEventFormOpen()) return false;
      if (isEditableKeyboardTarget(keyboardEvent)) return false;
      if (!getFocusedWeekGridEventTarget()) return false;

      const target = getFirstEventOnWeekdayColumn({
        allDayEvents,
        columnIndex,
        timedEvents,
        visible: listVisibleWeekGridEventTargets(),
        weekDays,
      });
      if (!target) return false;

      target.element.scrollIntoView({ block: "nearest" });
      focusWeekGridEventTarget(target);
      return true;
    },
    [allDayEvents, timedEvents, weekDays],
  );

  useGridEventEditShortcuts({
    allDayEvents,
    timedEvents,
    dayBoundary: { kind: "clamp", weekDays },
    targeting,
    repositionDraftByKey: repositionDraftByKeyboard,
  });

  useGridEventFormFieldSequences({
    allDayEvents,
    targeting,
    timedEvents,
  });

  useWeekViewShortcuts({
    onPreviousWeek: goToPreviousWeek,
    onNextWeek: goToNextWeek,
    onShiftViewBackward: shiftViewBackward,
    onShiftViewForward: shiftViewForward,
    onGoToToday: toToday,
    onCreateAllDayDraft: emitCreateAllDayDraft,
    onCreateTimedDraft: emitCreateTimedDraft,
    onFocusCalendar: focusFirstCalendarEvent,
    onFocusWeekdayColumn: focusWeekdayColumn,
  });
};
