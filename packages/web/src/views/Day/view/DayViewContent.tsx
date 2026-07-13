import { memo, useCallback, useMemo, useRef } from "react";
import dayjs from "@core/util/date/dayjs";
import { ID_MAIN } from "@web/common/constants/web.constants";
import { useHorizontalNavigation } from "@web/common/hooks/useHorizontalNavigation";
import {
  CompassDOMEvents,
  compassEventEmitter,
} from "@web/common/utils/dom/event-emitter.util";
import { CommandPalette } from "@web/components/CommandPalette/CommandPalette";
import { PlannerSidebar } from "@web/components/PlannerSidebar/PlannerSidebar";
import { ResizableSidebarPanel } from "@web/components/PlannerSidebar/ResizableSidebarPanel";
import { usePlannerShortcuts } from "@web/components/PlannerSidebar/usePlannerShortcuts";
import { focusFirstSidebarItem } from "@web/components/PlannerSidebar/util/sidebarFocus.util";
import {
  selectIsSidebarOpen,
  useViewStore,
  viewActions,
} from "@web/events/stores/view.store";
import { getShortcutMenuSections } from "@web/shortcuts/data/shortcuts.data";
import { DayCalendarGrid } from "@web/views/Day/components/Calendar/DayCalendarGrid";
import { Header } from "@web/views/Day/components/Header/Header";
import { getDayCmdTasks } from "@web/views/Day/getDayCmdTasks";
import { useDayEvents } from "@web/views/Day/hooks/events/useDayEvents";
import { useDateInView } from "@web/views/Day/hooks/navigation/useDateInView";
import { useDateNavigation } from "@web/views/Day/hooks/navigation/useDateNavigation";
import { useDayViewShortcuts } from "@web/views/Day/hooks/shortcuts/useDayViewShortcuts";
import {
  focusFirstDayCalendarEvent,
  openEventFormEditEvent,
} from "@web/views/Day/interaction/dayCalendarFocus.util";
import { Dedication } from "@web/views/Week/components/Dedication/Dedication";

export const DayViewContent = memo(() => {
  const isSidebarOpen = useViewStore(selectIsSidebarOpen);
  const mainRef = useRef<HTMLDivElement | null>(null);

  const dateInView = useDateInView();
  const isViewingToday = dateInView.isSame(dayjs(), "day");

  const {
    navigateToDate,
    navigateToNextDay,
    navigateToPreviousDay,
    navigateToToday,
  } = useDateNavigation();
  useHorizontalNavigation({
    containerRef: mainRef,
    onNext: navigateToNextDay,
    onPrevious: navigateToPreviousDay,
  });
  useDayEvents(dateInView);

  const plannerViewStart = dateInView.startOf("week");
  const plannerViewEnd = dateInView.endOf("week");

  const toggleSidebar = useCallback(() => {
    viewActions.toggleSidebar();
  }, []);

  // "u" implies the user wants the sidebar; open it first and defer focus a
  // frame so the sidebar exists in the DOM before we target it.
  const handleFocusSidebar = useCallback(() => {
    if (selectIsSidebarOpen(useViewStore.getState())) {
      focusFirstSidebarItem();
      return;
    }
    viewActions.setSidebarOpen(true);
    requestAnimationFrame(() => focusFirstSidebarItem());
  }, []);

  const { closeShortcuts, isShortcutsOpen, toggleShortcuts } =
    usePlannerShortcuts({
      isSidebarOpen,
      onToggleSidebar: toggleSidebar,
    });

  const shortcutSections = useMemo(
    () =>
      getShortcutMenuSections({
        view: "day",
        isViewingCurrentPeriod: isViewingToday,
      }),
    [isViewingToday],
  );

  const handleGoToToday = useCallback(() => {
    // Compare dates in the same timezone to avoid timezone issues
    // Both dates are in local timezone, ensuring accurate day comparison
    const today = dayjs().startOf("day");
    const isViewingToday = dateInView.isSame(today, "day");

    if (isViewingToday) {
      compassEventEmitter.emit(CompassDOMEvents.SCROLL_TO_NOW_LINE);
    } else {
      navigateToToday();
    }
  }, [dateInView, navigateToToday]);

  const handleCreateTimedEvent = useCallback(() => {
    compassEventEmitter.emit(CompassDOMEvents.CREATE_TIMED_DRAFT);
  }, []);

  const handleCreateAllDayEvent = useCallback(() => {
    compassEventEmitter.emit(CompassDOMEvents.CREATE_ALLDAY_DRAFT);
  }, []);

  useDayViewShortcuts({
    onCreateTimedEvent: handleCreateTimedEvent,
    onCreateAllDayEvent: handleCreateAllDayEvent,
    onEditEvent: openEventFormEditEvent,
    onFocusSidebar: handleFocusSidebar,
    onFocusCalendar: focusFirstDayCalendarEvent,
    onNextDay: navigateToNextDay,
    onPrevDay: navigateToPreviousDay,
    onGoToToday: handleGoToToday,
  });

  return (
    <div id="day" className="flex h-screen w-screen overflow-hidden">
      <CommandPalette
        currentView="day"
        today={dayjs()}
        onGoToToday={handleGoToToday}
        onShowShortcuts={toggleShortcuts}
        commonTasks={getDayCmdTasks()}
        placeholder="Try: 'week', 'today', 'bug', or 'feedback'"
      />
      <Dedication />

      <ResizableSidebarPanel isOpen={isSidebarOpen}>
        <PlannerSidebar
          calendarDate={dateInView}
          isShortcutsOpen={isShortcutsOpen}
          onCloseShortcuts={closeShortcuts}
          onToggleShortcuts={toggleShortcuts}
          onSelectDate={navigateToDate}
          onToggleSidebar={toggleSidebar}
          shortcutSections={shortcutSections}
          shortcutsViewLabel="Day"
          showSomedayEventSections={false}
          viewEnd={plannerViewEnd}
          viewStart={plannerViewStart}
        />
      </ResizableSidebarPanel>

      <div
        id={ID_MAIN}
        ref={mainRef}
        className="flex h-screen flex-1 flex-col overflow-hidden bg-bg-primary pt-5 pl-8 transition-[width] duration-200 ease-out motion-reduce:transition-none"
      >
        <Header />

        <div className="flex w-full flex-1 overflow-hidden">
          <DayCalendarGrid />
        </div>
      </div>
    </div>
  );
});

DayViewContent.displayName = "DayViewContent";
