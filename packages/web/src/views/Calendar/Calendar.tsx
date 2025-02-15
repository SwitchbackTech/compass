import React from "react";
import { FlexDirections } from "@web/components/Flex/styled";
import { ID_MAIN } from "@web/common/constants/web.constants";
import { useAppSelector } from "@web/store/store.hooks";
import { selectIsSidebarOpen } from "@web/ducks/events/selectors/view.selectors";

import GridContextMenuWrapper from "./components/Grid/ContextMenu/GridContextMenuWrapper";
import { Grid } from "./components/Grid/";
import { useScroll } from "./hooks/grid/useScroll";
import { useToday } from "./hooks/useToday";
import { useWeek } from "./hooks/useWeek";
import { Header } from "./components/Header";
import { RootProps } from "./calendarView.types";
import { Styled, StyledCalendar } from "./styled";
import { useGridLayout } from "./hooks/grid/useGridLayout";
import { useDateCalcs } from "./hooks/grid/useDateCalcs";
import { useShortcuts } from "./hooks/shortcuts/useShortcuts";
import { useRefresh } from "./hooks/useRefresh";
import { Sidebar } from "./components/Sidebar";
import { Draft } from "./components/Event/Draft";
import { Dedication } from "./components/Dedication";
import { CmdPalette } from "../CmdPalette";

export const CalendarView = () => {
  const isSidebarOpen = useAppSelector(selectIsSidebarOpen);

  const { today } = useToday();

  useRefresh();
  const weekProps = useWeek(today);

  const { gridRefs, measurements } = useGridLayout(
    isSidebarOpen,
    weekProps.component.week
  );

  const scrollUtil = useScroll(gridRefs.gridScrollRef);

  const dateCalcs = useDateCalcs(measurements, gridRefs.gridScrollRef);

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

      <Draft
        dateCalcs={dateCalcs}
        isSidebarOpen={isSidebarOpen}
        measurements={measurements}
        weekProps={weekProps}
      />

      {isSidebarOpen && (
        <Sidebar
          dateCalcs={dateCalcs}
          measurements={measurements}
          weekProps={weekProps}
          gridRefs={gridRefs}
        />
      )}
      <StyledCalendar direction={FlexDirections.COLUMN} id={ID_MAIN}>
        <Header
          rootProps={rootProps}
          scrollUtil={scrollUtil}
          today={today}
          weekProps={weekProps}
        />

        <GridContextMenuWrapper weekProps={weekProps}>
          <Grid
            dateCalcs={dateCalcs}
            isSidebarOpen={isSidebarOpen}
            gridRefs={gridRefs}
            measurements={measurements}
            today={today}
            weekProps={weekProps}
          />
        </GridContextMenuWrapper>
      </StyledCalendar>
    </Styled>
  );
};
