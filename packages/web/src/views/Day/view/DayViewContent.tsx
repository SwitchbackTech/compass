import { memo, useCallback, useMemo, useRef } from "react";
import dayjs from "@core/util/date/dayjs";
import { getCommandPalettePlaceholder } from "@web/common/constants/more.cmd.constants";
import { ID_MAIN } from "@web/common/constants/web.constants";
import { useHorizontalNavigation } from "@web/common/hooks/useHorizontalNavigation";
import { emitViewCommand } from "@web/common/utils/dom/view-command-bus";
import { CommandPalette } from "@web/components/CommandPalette/CommandPalette";
import { DemoEventsBannerGate } from "@web/components/DemoEventsBanner/DemoEventsBannerGate";
import { welcomeGuideActions } from "@web/components/WelcomeModal/welcome.guide.store";
import { SidebarEventDetails } from "@web/components/Sidebar/EventDetails/SidebarEventDetails";
import { ResizableSidebarPanel } from "@web/components/Sidebar/ResizableSidebarPanel";
import { Sidebar } from "@web/components/Sidebar/Sidebar";
import { useUpNextEventShortcut } from "@web/components/Sidebar/UpNextCard/useUpNextEvent";
import { useSidebarShortcuts } from "@web/components/Sidebar/useSidebarShortcuts";
import { focusFirstSidebarItem } from "@web/components/Sidebar/util/sidebarFocus.util";
import {
  selectIsEventFormOpen,
  useDraftStore,
} from "@web/events/stores/draft.store";
import {
  selectIsSidebarOpen,
  useViewStore,
  viewActions,
} from "@web/events/stores/view.store";
import { getShortcutMenuSections } from "@web/shortcuts/data/shortcuts.data";
import { DayCalendarGrid } from "@web/views/Day/components/Calendar/DayCalendarGrid";
import { Header } from "@web/views/Day/components/Header/Header";
import { useDayEvents } from "@web/views/Day/hooks/events/useDayEvents";
import { useDateInView } from "@web/views/Day/hooks/navigation/useDateInView";
import { useDateNavigation } from "@web/views/Day/hooks/navigation/useDateNavigation";
import { useDayViewShortcuts } from "@web/views/Day/hooks/shortcuts/useDayViewShortcuts";
import { focusFirstDayCalendarEvent } from "@web/views/Day/interaction/day-event.focus";
import { Dedication } from "@web/views/Week/components/Dedication/Dedication";

export const DayViewContent = memo(() => {
  const isSidebarOpen = useViewStore(selectIsSidebarOpen);
  // Event details live in the sidebar, so an open form reveals the sidebar
  // even when the user keeps it collapsed; their persisted preference is
  // untouched and the panel collapses again when the form closes.
  const isEventDetailsOpen = useDraftStore(selectIsEventFormOpen);
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
  useUpNextEventShortcut();

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
    useSidebarShortcuts({
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
      emitViewCommand("SCROLL_TO_NOW_LINE");
    } else {
      navigateToToday();
    }
  }, [dateInView, navigateToToday]);

  const handleCreateTimedEvent = useCallback(() => {
    emitViewCommand("CREATE_TIMED_DRAFT");
  }, []);

  const handleCreateAllDayEvent = useCallback(() => {
    emitViewCommand("CREATE_ALLDAY_DRAFT");
  }, []);

  useDayViewShortcuts({
    onCreateTimedEvent: handleCreateTimedEvent,
    onCreateAllDayEvent: handleCreateAllDayEvent,
    onFocusSidebar: handleFocusSidebar,
    onFocusCalendar: focusFirstDayCalendarEvent,
    onNextDay: navigateToNextDay,
    onPrevDay: navigateToPreviousDay,
    onGoToToday: handleGoToToday,
  });

  const openWelcomeGuide = useCallback(() => {
    welcomeGuideActions.open();
  }, []);

  return (
    <div id="day" className="flex h-screen w-screen overflow-hidden">
      <CommandPalette
        currentView="day"
        onGoToToday={handleGoToToday}
        onShowShortcuts={toggleShortcuts}
        onShowWelcomeGuide={openWelcomeGuide}
        placeholder={getCommandPalettePlaceholder("day")}
      />
      <Dedication />

      <div
        id={ID_MAIN}
        ref={mainRef}
        className="flex h-screen flex-1 flex-col overflow-hidden bg-background pt-5 pl-8 transition-[width] duration-200 ease-out motion-reduce:transition-none"
      >
        <Header />
        <DemoEventsBannerGate />

        <div className="flex w-full flex-1 overflow-hidden">
          <DayCalendarGrid />
        </div>
      </div>

      <ResizableSidebarPanel isOpen={isSidebarOpen || isEventDetailsOpen}>
        <Sidebar
          calendarDate={dateInView}
          eventDetails={<SidebarEventDetails />}
          isEventDetailsOpen={isEventDetailsOpen}
          isShortcutsOpen={isShortcutsOpen}
          onCloseShortcuts={closeShortcuts}
          onToggleShortcuts={toggleShortcuts}
          onSelectDate={navigateToDate}
          shortcutSections={shortcutSections}
          shortcutsViewLabel="Day"
        />
      </ResizableSidebarPanel>
    </div>
  );
});

DayViewContent.displayName = "DayViewContent";
