import React from "react";
import { FlexDirections } from "@web/components/Flex/styled";
import { DragLayer } from "@web/views/Calendar/containers/DragLayer";
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
import { Sidebar } from "./components/Sidebar";
import { Draft } from "./components/Event/Draft";

export const Calendar = () => {
  return <CalendarView />;
};

export const CalendarView = () => {
  const prefs = usePreferences();

  const { today } = useToday();

  const weekProps = useWeek(today);

  const { gridRefs, measurements } = useGridLayout(weekProps.component.week);

  const dateCalcs = useDateCalcs(measurements, gridRefs.gridScrollRef);

  const scrollUtil = useScroll(gridRefs.gridScrollRef);

  useShortcuts(
    today,
    dateCalcs,
    weekProps.component.isCurrentWeek,
    weekProps.component.startOfSelectedWeekDay,
    weekProps.state.setWeek,
    scrollUtil,
    prefs.toggleSidebar
  );

  const rootProps: RootProps = {
    component: { today: today },
  };

  return (
    <Styled id="cal">
      <DragLayer
        dateCalcs={dateCalcs}
        measurements={measurements}
        viewStart={weekProps.component.startOfSelectedWeekDay}
      />

      <Draft
        dateCalcs={dateCalcs}
        isSidebarOpen={prefs.isSidebarOpen}
        measurements={measurements}
        weekProps={weekProps}
      />

      <Sidebar prefs={prefs} weekProps={weekProps} />

      <StyledCalendar direction={FlexDirections.COLUMN} id={ID_MAIN}>
        <Header
          rootProps={rootProps}
          scrollUtil={scrollUtil}
          today={today}
          weekProps={weekProps}
        />

        <Grid
          dateCalcs={dateCalcs}
          isSidebarOpen={prefs.isSidebarOpen}
          gridRefs={gridRefs}
          measurements={measurements}
          today={today}
          weekProps={weekProps}
        />
      </StyledCalendar>
    </Styled>
  );
};
