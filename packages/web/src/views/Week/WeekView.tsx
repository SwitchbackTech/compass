import { useCallback, useMemo } from "react";
import { ID_MAIN } from "@web/common/constants/web.constants";
import { getShortcutMenuSections } from "@web/common/shortcuts/data/shortcuts.data";
import { isEventFormOpen } from "@web/common/utils/form/form.util";
import { CollapsiblePanel } from "@web/components/CollapsiblePanel/CollapsiblePanel";
import { CommandPalette } from "@web/components/CommandPalette/CommandPalette";
import { ContextMenuWrapper } from "@web/components/ContextMenu/GridContextMenuWrapper";
import { SidebarDraftProvider } from "@web/components/PlannerSidebar/draft/context/SidebarDraftProvider";
import { PlannerSidebar } from "@web/components/PlannerSidebar/PlannerSidebar";
import { SomedayInteractionCoordinator } from "@web/components/PlannerSidebar/SomedayEventSections/interaction/SomedayInteractionCoordinator";
import { usePlannerShortcuts } from "@web/components/PlannerSidebar/usePlannerShortcuts";
import { draftActions } from "@web/events/stores/draft.store";
import {
  selectIsSidebarOpen,
  useViewStore,
  viewActions,
} from "@web/events/stores/view.store";
import { RecurringEventUpdateScopeDialog } from "@web/views/Forms/EventForm/RecurringEventUpdateScopeDialog";
import { Dedication } from "@web/views/Week/components/Dedication/Dedication";
import { DraftProvider } from "@web/views/Week/components/Draft/context/DraftProvider";
import { Draft } from "@web/views/Week/components/Draft/Draft";
import { Grid } from "@web/views/Week/components/Grid/Grid";
import { WeekGridScrollArea } from "@web/views/Week/components/Grid/WeekGridScrollArea";
import { DayLabels } from "@web/views/Week/components/Header/DayLabels";
import { Header } from "@web/views/Week/components/Header/Header";
import { Shortcuts } from "@web/views/Week/components/Shortcuts";
import { useDateCalcs } from "@web/views/Week/hooks/grid/useDateCalcs";
import { useGridLayout } from "@web/views/Week/hooks/grid/useGridLayout";
import { useScroll } from "@web/views/Week/hooks/grid/useScroll";
import { useVisibleDayCount } from "@web/views/Week/hooks/grid/useVisibleDayCount";
import { usePlannerSidebarCalendarDate } from "@web/views/Week/hooks/usePlannerSidebarCalendarDate";
import { useToday } from "@web/views/Week/hooks/useToday";
import { useWeek } from "@web/views/Week/hooks/useWeek";
import { useWeekCmdTasks } from "@web/views/Week/hooks/useWeekCmdTasks";
import { WeekInteractionCoordinator } from "@web/views/Week/interaction/WeekInteractionCoordinator";
import { SIDEBAR_OPEN_WIDTH } from "@web/views/Week/layout.constants";

export const WeekView = () => {
  const isSidebarOpen = useViewStore(selectIsSidebarOpen);
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
        <SidebarDraftProvider
          onGoToDate={goToDateFromSidebar}
          viewEnd={weekProps.component.endOfView}
          viewStart={weekProps.component.startOfView}
        >
          <SomedayInteractionCoordinator
            getLayoutSources={getWeekInteractionLayoutSources}
            weekProps={weekProps}
          >
            <Shortcuts shortcutsProps={shortcutProps}>
              <ContextMenuWrapper id="sidebar-context-menu">
                <Draft measurements={measurements} weekProps={weekProps} />
                <CollapsiblePanel
                  isOpen={isSidebarOpen}
                  width={SIDEBAR_OPEN_WIDTH}
                >
                  <PlannerSidebar
                    calendarDate={calendarDate}
                    isShortcutsOpen={isShortcutsOpen}
                    onCloseShortcuts={closeShortcuts}
                    onToggleShortcuts={toggleShortcuts}
                    onSelectDate={goToDateFromSidebar}
                    onToggleSidebar={toggleSidebar}
                    shortcutSections={shortcutSections}
                    shortcutsViewLabel="Week"
                    viewEnd={weekProps.component.endOfView}
                    viewStart={weekProps.component.startOfView}
                  />
                </CollapsiblePanel>
              </ContextMenuWrapper>
              <div
                id={ID_MAIN}
                className="flex h-screen flex-1 flex-col overflow-hidden bg-bg-primary pt-5 pr-0 pb-0 pl-8 transition-[width] duration-200 ease-out motion-reduce:transition-none"
              >
                <Header scrollUtil={scrollUtil} weekProps={weekProps} />

                <WeekGridScrollArea>
                  <div
                    ref={trackRef}
                    className="relative flex h-full w-full min-w-[190px] flex-col [container-name:week-grid-track] [container-type:inline-size]"
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
          </SomedayInteractionCoordinator>

          <RecurringEventUpdateScopeDialog />
        </SidebarDraftProvider>
      </DraftProvider>
    </div>
  );
};
