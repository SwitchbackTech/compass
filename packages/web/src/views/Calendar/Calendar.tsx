import React from "react";
import { ID_MAIN } from "@web/common/constants/web.constants";
import { ContextMenuWrapper } from "@web/components/ContextMenu/GridContextMenuWrapper";
import { FlexDirections } from "@web/components/Flex/styled";
import { selectIsSidebarOpen } from "@web/ducks/events/selectors/view.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { CmdPalette } from "../CmdPalette";
import { RootProps } from "./calendarView.types";
import { Dedication } from "./components/Dedication";
import { Draft } from "./components/Draft/Draft";
import { DraftProvider } from "./components/Draft/context/DraftProvider";
import { SidebarDraftProvider } from "./components/Draft/sidebar/context/SidebarDraftProvider";
import { Grid } from "./components/Grid/";
import { Header } from "./components/Header/Header";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { useDateCalcs } from "./hooks/grid/useDateCalcs";
import { useGridLayout } from "./hooks/grid/useGridLayout";
import { useScroll } from "./hooks/grid/useScroll";
import { useShortcuts } from "./hooks/shortcuts/useShortcuts";
import { useRefresh } from "./hooks/useRefresh";
import { useToday } from "./hooks/useToday";
import { useWeek } from "./hooks/useWeek";
import { Styled, StyledCalendar } from "./styled";

export const CalendarView = () => {
  const isSidebarOpen = useAppSelector(selectIsSidebarOpen);

  const { today } = useToday();

  useRefresh();
  const weekProps = useWeek(today);

  const { gridRefs, measurements } = useGridLayout(
    isSidebarOpen,
    weekProps.component.week,
  );

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

  useShortcuts(shortcutProps);

  const rootProps: RootProps = {
    component: { today: today },
  };

  return (
    <Styled id="cal">
      <CmdPalette {...shortcutProps} />
      <Dedication />

      <DraftProvider
        dateCalcs={dateCalcs}
        weekProps={weekProps}
        isSidebarOpen={isSidebarOpen}
      >
        <SidebarDraftProvider dateCalcs={dateCalcs} measurements={measurements}>
          <ContextMenuWrapper id="sidebar-context-menu">
            <Draft measurements={measurements} weekProps={weekProps} />
            {isSidebarOpen && (
              <Sidebar
                dateCalcs={dateCalcs}
                measurements={measurements}
                weekProps={weekProps}
                gridRefs={gridRefs}
              />
            )}
          </ContextMenuWrapper>
        </SidebarDraftProvider>
        <StyledCalendar direction={FlexDirections.COLUMN} id={ID_MAIN}>
          <Header
            rootProps={rootProps}
            scrollUtil={scrollUtil}
            today={today}
            weekProps={weekProps}
          />

          <ContextMenuWrapper id="grid-context-menu">
            <Grid
              dateCalcs={dateCalcs}
              isSidebarOpen={isSidebarOpen}
              gridRefs={gridRefs}
              measurements={measurements}
              today={today}
              weekProps={weekProps}
            />
          </ContextMenuWrapper>
        </StyledCalendar>
      </DraftProvider>
    </Styled>
  );
};
