import { useCallback, useMemo } from "react";
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
import { Styled, StyledCalendar, WeekGridTrack } from "@web/views/Week/styled";

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
          { k: "j", label: "Previous week" },
          { k: "k", label: "Next week" },
          {
            k: "t",
            label: isCurrentWeek ? "Scroll to now" : "Go to current week",
          },
        ],
      },
      {
        title: "Create",
        shortcuts: [
          { k: "c", label: "Create timed event" },
          { k: "a", label: "Create all-day event" },
          { k: "Arrow keys", label: "Move draft event" },
          { k: "I", label: "Focus calendar event" },
          { k: "M", label: "Edit calendar event" },
          { k: "Shift+w", label: "Create Someday week event" },
          { k: "Shift+m", label: "Create Someday month event" },
        ],
      },
      {
        title: "Global",
        shortcuts: [
          { k: "d", label: "Day" },
          { k: "w", label: "Week" },
          { k: "[", label: "Toggle sidebar" },
          { k: "?", label: "Toggle shortcuts" },
          { k: "Mod+k", label: "Command Palette" },
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
    <Styled id="cal">
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
              <StyledCalendar>
                <Header scrollUtil={scrollUtil} weekProps={weekProps} />

                <WeekGridScrollArea>
                  <WeekGridTrack>
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
                  </WeekGridTrack>
                </WeekGridScrollArea>
              </StyledCalendar>
            </Shortcuts>
          </SomedayInteractionCoordinator>

          <RecurringEventUpdateScopeDialog />
        </SidebarDraftProvider>
      </DraftProvider>
    </Styled>
  );
};
