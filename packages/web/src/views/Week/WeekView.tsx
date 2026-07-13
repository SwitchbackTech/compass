import { useCallback, useMemo, useRef } from "react";
import { ID_MAIN } from "@web/common/constants/web.constants";
import { useHorizontalNavigation } from "@web/common/hooks/useHorizontalNavigation";
import { isEventFormOpen } from "@web/common/utils/form/form.util";
import { CommandPalette } from "@web/components/CommandPalette/CommandPalette";
import { ContextMenuWrapper } from "@web/components/ContextMenu/GridContextMenuWrapper";
import { PlannerSidebar } from "@web/components/PlannerSidebar/PlannerSidebar";
import { ResizableSidebarPanel } from "@web/components/PlannerSidebar/ResizableSidebarPanel";
import { usePlannerShortcuts } from "@web/components/PlannerSidebar/usePlannerShortcuts";
import {
  draftActions,
  selectIsEventFormOpen,
  useDraftStore,
} from "@web/events/stores/draft.store";
import {
  selectIsSidebarOpen,
  useViewStore,
  viewActions,
} from "@web/events/stores/view.store";
import { getShortcutMenuSections } from "@web/shortcuts/data/shortcuts.data";
import { ConvertToStandaloneDialog } from "@web/views/Forms/EventForm/ConvertToStandaloneDialog";
import { RecurrenceScopeDialog } from "@web/views/Forms/EventForm/RecurrenceScopeDialog";
import { Dedication } from "@web/views/Week/components/Dedication/Dedication";
import { DraftProvider } from "@web/views/Week/components/Draft/context/DraftProvider";
import { Draft } from "@web/views/Week/components/Draft/Draft";
import { WeekSidebarEventDetails } from "@web/views/Week/components/Draft/sidebar/WeekSidebarEventDetails";
import { Grid } from "@web/views/Week/components/Grid/Grid";
import { WeekGridScrollArea } from "@web/views/Week/components/Grid/WeekGridScrollArea";
import { DayLabels } from "@web/views/Week/components/Header/DayLabels";
import { Header } from "@web/views/Week/components/Header/Header";
import { Shortcuts } from "@web/views/Week/components/Shortcuts";
import { useDateCalcs } from "@web/views/Week/hooks/grid/useDateCalcs";
import { useGridLayout } from "@web/views/Week/hooks/grid/useGridLayout";
import { useScroll } from "@web/views/Week/hooks/grid/useScroll";
import { useVisibleDayCount } from "@web/views/Week/hooks/grid/useVisibleDayCount";
import { useDayShiftTransition } from "@web/views/Week/hooks/useDayShiftTransition";
import { usePlannerSidebarCalendarDate } from "@web/views/Week/hooks/usePlannerSidebarCalendarDate";
import { useToday } from "@web/views/Week/hooks/useToday";
import { useWeek } from "@web/views/Week/hooks/useWeek";
import { useWeekCmdTasks } from "@web/views/Week/hooks/useWeekCmdTasks";
import { WeekInteractionCoordinator } from "@web/views/Week/interaction/WeekInteractionCoordinator";

export const WeekView = () => {
  const isSidebarOpen = useViewStore(selectIsSidebarOpen);
  // Event details live in the sidebar, so an open form reveals the sidebar
  // even when the user keeps it collapsed; their persisted preference is
  // untouched and the panel collapses again when the form closes.
  const isEventDetailsOpen = useDraftStore(selectIsEventFormOpen);
  const toggleSidebar = useCallback(() => {
    viewActions.toggleSidebar();
  }, []);
  const { closeShortcuts, isShortcutsOpen, toggleShortcuts } =
    usePlannerShortcuts({
      isSidebarOpen,
      onToggleSidebar: toggleSidebar,
    });

  const { today } = useToday();

  const { trackRef, visibleDayCount } = useVisibleDayCount();

  const weekProps = useWeek(today, visibleDayCount);
  const mainRef = useRef<HTMLDivElement | null>(null);
  const weekTrackElementRef = useRef<HTMLDivElement | null>(null);
  const setTrackRef = useCallback(
    (node: HTMLDivElement | null) => {
      weekTrackElementRef.current = node;
      trackRef(node);
    },
    [trackRef],
  );
  useHorizontalNavigation({
    containerRef: mainRef,
    onNext: weekProps.util.incrementWeek,
    onPrevious: weekProps.util.decrementWeek,
  });
  useDayShiftTransition(
    weekTrackElementRef,
    weekProps.component.startOfView,
    weekProps.util.getLastNavigationSource(),
  );

  const { gridRefs, measurements } = useGridLayout(visibleDayCount);

  const scrollUtil = useScroll(gridRefs.mainGridRef);

  const dateCalcs = useDateCalcs(
    measurements,
    gridRefs.mainGridRef,
    weekProps.component.weekDays,
  );

  const isCurrentWeek = weekProps.component.isCurrentWeek;
  const util = weekProps.util;

  const shortcutProps = {
    isCurrentWeek,
    startOfView: weekProps.component.startOfView,
    endOfView: weekProps.component.endOfView,
    weekDays: weekProps.component.weekDays,
    util,
    scrollUtil,
  };

  const weekCmdTasks = useWeekCmdTasks({
    isCurrentWeek,
    startOfView: weekProps.component.startOfView,
    endOfView: weekProps.component.endOfView,
  });

  const goToTodayViaCmd = useCallback(() => {
    scrollUtil.scrollToNow();
    if (isEventFormOpen()) draftActions.discard();
    util.goToToday();
  }, [scrollUtil, util]);

  const shortcutSections = useMemo(
    () =>
      getShortcutMenuSections({
        view: "week",
        isViewingCurrentPeriod: isCurrentWeek,
      }),
    [isCurrentWeek],
  );

  const { calendarDate, goToDateFromSidebar } = usePlannerSidebarCalendarDate({
    goToDate: weekProps.state.goToDate,
    today,
    viewEnd: weekProps.component.endOfView,
    viewStart: weekProps.component.startOfView,
  });

  const getWeekInteractionLayoutSources = useCallback(
    () => ({
      allDayColumnsElement: gridRefs.allDayColumnsRef.current,
      mainGridElement: gridRefs.mainGridRef.current,
      timedColumnsElement: gridRefs.timedColumnsRef.current,
    }),
    [gridRefs.allDayColumnsRef, gridRefs.mainGridRef, gridRefs.timedColumnsRef],
  );

  return (
    <div id="cal" className="flex h-screen w-screen overflow-hidden">
      <CommandPalette
        currentView="week"
        today={today}
        onGoToToday={goToTodayViaCmd}
        onShowShortcuts={toggleShortcuts}
        commonTasks={weekCmdTasks}
        placeholder="Try: 'create', 'bug', or 'feedback'"
      />
      <Dedication />

      <DraftProvider dateCalcs={dateCalcs} weekProps={weekProps}>
        <Shortcuts shortcutsProps={shortcutProps}>
          <ContextMenuWrapper id="sidebar-context-menu">
            <Draft measurements={measurements} weekProps={weekProps} />
            <ResizableSidebarPanel isOpen={isSidebarOpen || isEventDetailsOpen}>
              <PlannerSidebar
                calendarDate={calendarDate}
                eventDetails={<WeekSidebarEventDetails />}
                isShortcutsOpen={isShortcutsOpen}
                onCloseShortcuts={closeShortcuts}
                onToggleShortcuts={toggleShortcuts}
                onSelectDate={goToDateFromSidebar}
                onToggleSidebar={toggleSidebar}
                shortcutSections={shortcutSections}
                shortcutsViewLabel="Week"
              />
            </ResizableSidebarPanel>
          </ContextMenuWrapper>
          <div
            id={ID_MAIN}
            ref={mainRef}
            className="flex h-screen flex-1 flex-col overflow-hidden bg-bg-primary pt-5 pr-0 pb-0 pl-8 transition-[width] duration-200 ease-out motion-reduce:transition-none"
          >
            <Header scrollUtil={scrollUtil} weekProps={weekProps} />

            <WeekGridScrollArea>
              <div
                ref={setTrackRef}
                className="@container relative flex h-full w-full min-w-47.5 flex-col [container-name:week-grid-track]"
              >
                <DayLabels
                  startOfView={weekProps.component.startOfView}
                  today={today}
                  week={weekProps.component.week}
                  weekDays={weekProps.component.weekDays}
                />

                <WeekInteractionCoordinator
                  getLayoutSources={getWeekInteractionLayoutSources}
                  weekProps={weekProps}
                >
                  <ContextMenuWrapper id="grid-context-menu">
                    <Grid
                      dateCalcs={dateCalcs}
                      gridRefs={gridRefs}
                      measurements={measurements}
                      today={today}
                      weekProps={weekProps}
                    />
                  </ContextMenuWrapper>
                </WeekInteractionCoordinator>
              </div>
            </WeekGridScrollArea>
          </div>
        </Shortcuts>

        <RecurrenceScopeDialog />
        <ConvertToStandaloneDialog />
      </DraftProvider>
    </div>
  );
};
