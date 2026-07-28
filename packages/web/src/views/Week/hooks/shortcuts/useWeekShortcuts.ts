import { useCallback, useEffect } from "react";
import { type Dayjs } from "@core/util/date/dayjs";
import { useCalendarsQuery } from "@web/calendars/calendar.query";
import { getDefaultTargetCalendar } from "@web/calendars/calendar.util";
import { onViewCommand } from "@web/common/utils/dom/view-command-bus";
import {
  createAlldayDraft,
  createTimedDraft,
} from "@web/common/utils/draft/draft.util";
import { isEventFormOpen } from "@web/common/utils/form/form.util";
import { focusFirstSidebarItem } from "@web/components/Sidebar/util/sidebarFocus.util";
import { useWeekEventViewModel } from "@web/events/queries/useWeekEventsQuery";
import { draftActions } from "@web/events/stores/draft.store";
import {
  selectIsSidebarOpen,
  useViewStore,
  viewActions,
} from "@web/events/stores/view.store";
import { useGridEventEditShortcuts } from "@web/grid/shortcuts/useGridEventEditShortcuts";
import { useAppShortcutUp } from "@web/shortcuts/useAppShortcut";
import { useDraftContext } from "@web/views/Week/components/Draft/context/useDraftContext";
import { type Util_Scroll } from "@web/views/Week/hooks/grid/useScroll";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import {
  focusWeekGridEventTarget,
  getFirstVisibleWeekGridEventTarget,
  getFocusedWeekGridEventTarget,
  getHoveredWeekGridEventTarget,
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

export const useWeekShortcuts = ({
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
    getDefaultTargetCalendar(calendars)?.id ?? null;
  const {
    actions: { repositionDraftByKeyboard },
  } = useDraftContext();

  const isSidebarOpen = useViewStore(selectIsSidebarOpen);
  const { allDayEvents, timedEvents } = useWeekEventViewModel({
    startOfView: queryStartOfView,
    endOfView: queryEndOfView,
  });
  const { decrementWeek, incrementWeek, goToToday, shiftViewByDay } = util;
  const { scrollToNow } = scrollUtil;

  const _discardDraft = useCallback(() => {
    if (isEventFormOpen()) {
      draftActions.discard();
    }
  }, []);

  const goToPreviousWeek = useCallback(() => {
    _discardDraft();
    decrementWeek();
  }, [decrementWeek, _discardDraft]);

  const toToday = useCallback(() => {
    scrollToNow();
    _discardDraft();
    goToToday();
  }, [scrollToNow, _discardDraft, goToToday]);

  const goToNextWeek = useCallback(() => {
    _discardDraft();
    incrementWeek();
  }, [incrementWeek, _discardDraft]);

  const shiftViewBackward = useCallback(() => {
    _discardDraft();
    shiftViewByDay(-1);
  }, [_discardDraft, shiftViewByDay]);

  const shiftViewForward = useCallback(() => {
    _discardDraft();
    shiftViewByDay(1);
  }, [_discardDraft, shiftViewByDay]);

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

  // The command palette's create-event rows emit these same commands
  // (event.cmd.constants.ts) so the "C"/"A" keys and the palette rows run
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

  const focusSidebar = useCallback(() => {
    if (!isSidebarOpen) {
      viewActions.toggleSidebar();
      // The sidebar renders conditionally; focus after the open commits
      requestAnimationFrame(() => focusFirstSidebarItem());
      return;
    }

    focusFirstSidebarItem();
  }, [isSidebarOpen]);

  const focusFirstCalendarEvent = useCallback(() => {
    const target = getFirstVisibleWeekGridEventTarget();
    if (!target) return;

    focusWeekGridEventTarget(target);
  }, []);

  useGridEventEditShortcuts({
    allDayEvents,
    timedEvents,
    dayBoundary: { kind: "clamp", weekDays },
    targeting: {
      getFocused: getFocusedWeekGridEventTarget,
      getHovered: getHoveredWeekGridEventTarget,
      getFirstVisible: getFirstVisibleWeekGridEventTarget,
    },
    repositionDraftByKey: repositionDraftByKeyboard,
  });

  useAppShortcutUp("J", goToPreviousWeek);
  useAppShortcutUp("K", goToNextWeek);
  useAppShortcutUp("Shift+J", shiftViewBackward);
  useAppShortcutUp("Shift+K", shiftViewForward);
  useAppShortcutUp("T", toToday);
  useAppShortcutUp("A", createAllDayDraftEvent);
  useAppShortcutUp("C", createTimedDraftEvent);
  useAppShortcutUp("I", focusSidebar);
  useAppShortcutUp("U", focusFirstCalendarEvent);
};
