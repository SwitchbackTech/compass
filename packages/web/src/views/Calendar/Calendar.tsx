import { ContextMenuWrapper } from "@web/components/ContextMenu/GridContextMenuWrapper";
import { selectIsSidebarOpen } from "@web/ducks/events/selectors/view.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { Dedication } from "@web/views/Calendar/components/Dedication/Dedication";
import { DraftProvider } from "@web/views/Calendar/components/Draft/context/DraftProvider";
import { Draft } from "@web/views/Calendar/components/Draft/Draft";
import { SidebarDraftProvider } from "@web/views/Calendar/components/Draft/sidebar/context/SidebarDraftProvider";
import { Grid } from "@web/views/Calendar/components/Grid/";
import { WeekGridScrollArea } from "@web/views/Calendar/components/Grid/WeekGridScrollArea";
import { DayLabels } from "@web/views/Calendar/components/Header/DayLabels";
import { Header } from "@web/views/Calendar/components/Header/Header";
import { Shortcuts } from "@web/views/Calendar/components/Shortcuts";
import { Sidebar } from "@web/views/Calendar/components/Sidebar/Sidebar";
import { useDateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { useGridLayout } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { useScroll } from "@web/views/Calendar/hooks/grid/useScroll";
import { useRefetch } from "@web/views/Calendar/hooks/useRefetch";
import { useToday } from "@web/views/Calendar/hooks/useToday";
import { useWeek } from "@web/views/Calendar/hooks/useWeek";
import {
  Styled,
  StyledCalendar,
  WeekGridTrack,
} from "@web/views/Calendar/styled";
import { CmdPalette } from "@web/views/CmdPalette";
import { RecurringEventUpdateScopeDialog } from "@web/views/Forms/EventForm/RecurringEventUpdateScopeDialog";

export const CalendarView = () => {
  useRefetch();

  const isSidebarOpen = useAppSelector(selectIsSidebarOpen);

  const { today } = useToday();

  const weekProps = useWeek(today);

  const { gridRefs, measurements } = useGridLayout();

  const scrollUtil = useScroll(gridRefs.mainGridRef);

  const dateCalcs = useDateCalcs(measurements, gridRefs.mainGridRef);

  const isCurrentWeek = weekProps.component.isCurrentWeek;
  const util = weekProps.util;

  const shortcutProps = {
    today,
    dateCalcs,
    isCurrentWeek,
    startOfView: weekProps.component.startOfView,
    endOfView: weekProps.component.endOfView,
    util,
    scrollUtil,
  };

  return (
    <Styled id="cal">
      <CmdPalette {...shortcutProps} />
      <Dedication />

      <DraftProvider dateCalcs={dateCalcs} weekProps={weekProps}>
        <SidebarDraftProvider dateCalcs={dateCalcs} weekProps={weekProps}>
          <Shortcuts shortcutsProps={shortcutProps}>
            <ContextMenuWrapper id="sidebar-context-menu">
              <Draft measurements={measurements} weekProps={weekProps} />
              {isSidebarOpen ? (
                <Sidebar
                  dateCalcs={dateCalcs}
                  measurements={measurements}
                  weekProps={weekProps}
                  gridRefs={gridRefs}
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

                  <ContextMenuWrapper id="grid-context-menu">
                    <Grid
                      dateCalcs={dateCalcs}
                      gridRefs={gridRefs}
                      measurements={measurements}
                      today={today}
                      weekProps={weekProps}
                    />
                  </ContextMenuWrapper>
                </WeekGridTrack>
              </WeekGridScrollArea>
            </StyledCalendar>
          </Shortcuts>

          <RecurringEventUpdateScopeDialog />
        </SidebarDraftProvider>
      </DraftProvider>
    </Styled>
  );
};
