import React from "react";
import dayjs from "dayjs";
import { FlexDirections } from "@web/components/Flex/styled";
import { DragLayer } from "@web/views/Calendar/containers/DragLayer";

import { Grid } from "./components/Grid/";
import { useScroll } from "./hooks/grid/useScroll";
import { useDateCalcs } from "./hooks/grid/useDateCalcs";
import { useShortcuts } from "./hooks/shortcuts/useShortcuts";
import { useToday } from "./hooks/useToday";
import { useWeek } from "./hooks/useWeek";
import { Header } from "./components/Header";
import { RootProps } from "./calendarView.types";
import { Styled, StyledCalendar } from "./styled";
import { useGridLayout } from "./hooks/grid/useGridLayout";
import { usePreferences } from "./hooks/usePreferences";
import { Sidebar } from "./components/Sidebar";

export const Calendar = () => {
  console.log("reminder: check if authed before showing cal (?)");
  return <CalendarView />;
};

export const CalendarView = () => {
  const prefs = usePreferences();

  const { today, todayIndex } = useToday();
  const weekProps = useWeek(today);

  const { gridRefs, measurements } = useGridLayout(weekProps.component.week);

  // const today = dayjs("2022-06-11");
  // const todayIndex = today.get("day");

  const dateCalcs = useDateCalcs(measurements, gridRefs.gridScrollRef);

  useShortcuts(
    today,
    dateCalcs,
    weekProps.component.isCurrentWeek,
    weekProps.component.startOfSelectedWeekDay,
    weekProps.state.setWeek
  );

  useScroll(gridRefs.gridScrollRef);

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
      <Sidebar
        // onTransitionEnd={() =>
        //   setResize({ height: window.innerHeight, width: window.innerWidth })
        // }
        prefs={prefs}
        weekProps={weekProps}
      />
      <StyledCalendar direction={FlexDirections.COLUMN}>
        <Header rootProps={rootProps} today={today} weekProps={weekProps} />

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
