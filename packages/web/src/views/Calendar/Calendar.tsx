import React from "react";
import { FlexDirections } from "@web/components/Flex/styled";
import { ID_MAIN } from "@web/common/constants/web.constants";

import { Grid } from "./components/Grid/";
import { useScroll } from "./hooks/grid/useScroll";
import { useToday } from "./hooks/useToday";
import { useWeek } from "./hooks/useWeek";
import { Header } from "./components/Header";
import { RootProps } from "./calendarView.types";
import { Styled, StyledCalendar } from "./styled";
import { useGridLayout } from "./hooks/grid/useGridLayout";
import { usePreferences } from "./hooks/usePreferences";
import { useDateCalcs } from "./hooks/grid/useDateCalcs";
import { useShortcuts } from "./hooks/shortcuts/useShortcuts";
import { LeftSidebar } from "./components/LeftSidebar";
import { RightSidebar } from "./components/RightSidebar";
import { Draft } from "./components/Event/Draft";
import { Dedication } from "./components/Dedication";
import { CmdPalette } from "../CmdPalette";

export const CalendarView = () => {
  const prefs = usePreferences();

  const { today } = useToday();

  const weekProps = useWeek(today);

  const { gridRefs, measurements } = useGridLayout(weekProps.component.week);

  const scrollUtil = useScroll(gridRefs.gridScrollRef);

  const dateCalcs = useDateCalcs(measurements, gridRefs.gridScrollRef);

  const isCurrentWeek = weekProps.component.isCurrentWeek;
  const startOfSelectedWeek = weekProps.component.startOfView;
  const util = weekProps.util;
  const toggleSidebar = prefs.toggleSidebar;

  const shortcutProps = {
    today,
    dateCalcs,
    isCurrentWeek,
    startOfSelectedWeek,
    util,
    scrollUtil,
    toggleSidebar,
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
        isSidebarOpen={prefs.isLeftSidebarOpen}
        measurements={measurements}
        weekProps={weekProps}
      />

      <LeftSidebar
        dateCalcs={dateCalcs}
        prefs={prefs}
        measurements={measurements}
        weekProps={weekProps}
      />

      <StyledCalendar direction={FlexDirections.COLUMN} id={ID_MAIN}>
        <Header
          rootProps={rootProps}
          scrollUtil={scrollUtil}
          today={today}
          weekProps={weekProps}
        />

        <Grid
          dateCalcs={dateCalcs}
          isSidebarOpen={prefs.isLeftSidebarOpen}
          gridRefs={gridRefs}
          measurements={measurements}
          today={today}
          weekProps={weekProps}
        />
      </StyledCalendar>

      <RightSidebar weekProps={weekProps} />
    </Styled>
  );
};
