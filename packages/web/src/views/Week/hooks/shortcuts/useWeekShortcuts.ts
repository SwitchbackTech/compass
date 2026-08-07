import { useCallback, useEffect } from "react";
import { type Dayjs } from "@core/util/date/dayjs";
import { useCalendarsQuery } from "@web/calendars/calendar.query";
import { useDefaultTargetCalendar } from "@web/calendars/useDefaultTargetCalendar";
import { onViewCommand } from "@web/common/utils/dom/view-command-bus";
import {
  createAlldayDraft,
  createTimedDraft,
} from "@web/common/utils/draft/draft.util";
import { useFocusSidebarShortcut } from "@web/components/Sidebar/useFocusSidebarShortcut";
import { useWeekEventViewModel } from "@web/events/queries/useWeekEventsQuery";
import { draftActions, isEventFormOpen } from "@web/events/stores/draft.store";
import { useGridEventEditShortcuts } from "@web/grid/shortcuts/useGridEventEditShortcuts";
import { useAppShortcutUp } from "@web/shortcuts/useAppShortcut";
import { useDraftContext } from "@web/views/Week/components/Draft/context/useDraftContext";
import { type Util_Scroll } from "@web/views/Week/hooks/grid/useScroll";
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
    goToTodayInWeek({ scrollToNow, goToToday });
  }, [scrollToNow, goToToday]);

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

  useFocusSidebarShortcut();

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
      focus: focusWeekGridEventTarget,
      getFocused: getFocusedWeekGridEventTarget,
      listVisible: listVisibleWeekGridEventTargets,
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
  useAppShortcutUp("U", focusFirstCalendarEvent);
};
