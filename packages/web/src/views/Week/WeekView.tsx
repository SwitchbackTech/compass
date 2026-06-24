import { useCallback, useMemo } from "react";
import { ID_MAIN } from "@web/common/constants/web.constants";
import { ContextMenuWrapper } from "@web/components/ContextMenu/GridContextMenuWrapper";
import { SidebarDraftProvider } from "@web/components/PlannerSidebar/draft/context/SidebarDraftProvider";
import { PlannerSidebar } from "@web/components/PlannerSidebar/PlannerSidebar";
import { SomedayInteractionCoordinator } from "@web/components/PlannerSidebar/SomedayEventSections/interaction/SomedayInteractionCoordinator";
import { usePlannerShortcuts } from "@web/components/PlannerSidebar/usePlannerShortcuts";
import { selectIsSidebarOpen } from "@web/ducks/events/selectors/view.selectors";
import { viewSlice } from "@web/ducks/events/slices/view.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { CmdPalette } from "@web/views/CmdPalette";
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
import { usePlannerSidebarCalendarDate } from "@web/views/Week/hooks/usePlannerSidebarCalendarDate";
import { useRefetch } from "@web/views/Week/hooks/useRefetch";
import { useToday } from "@web/views/Week/hooks/useToday";
import { useWeek } from "@web/views/Week/hooks/useWeek";
import { WeekInteractionCoordinator } from "@web/views/Week/interaction/WeekInteractionCoordinator";

export const WeekView = () => {
  useRefetch();

  const dispatch = useAppDispatch();
  const isSidebarOpen = useAppSelector(selectIsSidebarOpen);
  const toggleSidebar = useCallback(() => {
    dispatch(viewSlice.actions.toggleSidebar());
  }, [dispatch]);
  const { closeShortcuts, isShortcutsOpen, toggleShortcuts } =
    usePlannerShortcuts({
      isSidebarOpen,
      onToggleSidebar: toggleSidebar,
    });

  const { today } = useToday();

  const weekProps = useWeek(today);

  const { gridRefs, measurements } = useGridLayout();

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
  const cmdPaletteProps = {
    ...shortcutProps,
    today,
  };

  const shortcutSections = useMemo(
    () => [
      {
        title: "Week",
        shortcuts: [
          { keys: ["j"], label: "Previous week" },
          { keys: ["k"], label: "Next week" },
          {
            keys: ["t"],
            label: isCurrentWeek ? "Scroll to now" : "Go to current week",
          },
        ],
      },
      {
        title: "Create",
        shortcuts: [
          { keys: ["c"], label: "Create timed event" },
          { keys: ["a"], label: "Create all-day event" },
          { keys: ["Arrow keys"], label: "Move draft event" },
          { keys: ["I"], label: "Focus calendar event" },
          { keys: ["M"], label: "Edit calendar event" },
          { keys: ["Shift", "w"], label: "Create Someday week event" },
          { keys: ["Shift", "m"], label: "Create Someday month event" },
        ],
      },
      {
        title: "Global",
        shortcuts: [
          { keys: ["d"], label: "Day" },
          { keys: ["w"], label: "Week" },
          { keys: ["["], label: "Toggle sidebar" },
          { keys: ["?"], label: "Toggle shortcuts" },
          { keys: ["Mod", "k"], label: "Command Palette" },
        ],
      },
    ],
    [isCurrentWeek],
  );

  const { calendarDate, goToDateFromSidebar } = usePlannerSidebarCalendarDate({
    setStartOfView: weekProps.state.setStartOfView,
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
      <CmdPalette {...cmdPaletteProps} />
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
                {isSidebarOpen ? (
                  <PlannerSidebar
                    calendarDate={calendarDate}
                    isShortcutsOpen={isShortcutsOpen}
                    onCloseShortcuts={closeShortcuts}
                    onToggleShortcuts={toggleShortcuts}
                    onSelectDate={goToDateFromSidebar}
                    onToggleSidebar={toggleSidebar}
                    shortcutSections={shortcutSections}
                    viewEnd={weekProps.component.endOfView}
                    viewStart={weekProps.component.startOfView}
                  />
                ) : null}
              </ContextMenuWrapper>
              <div
                id={ID_MAIN}
                className="flex h-screen flex-1 flex-col overflow-hidden bg-bg-primary pt-8 pr-0 pb-0 pl-8"
              >
                <Header scrollUtil={scrollUtil} weekProps={weekProps} />

                <WeekGridScrollArea>
                  <div className="relative flex h-full w-full min-w-176 flex-col [container-name:week-grid-track] [container-type:inline-size]">
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
