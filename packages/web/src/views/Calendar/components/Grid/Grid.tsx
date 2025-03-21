import { Dayjs } from "dayjs";
import React, { FC } from "react";
import { AllDayRow } from "@web/views/Calendar/components/Grid/AllDayRow";
import { MainGrid } from "@web/views/Calendar/components/Grid/MainGrid";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { Refs_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";

interface Props {
  dateCalcs: DateCalcs;
  gridRefs: Refs_Grid;
  isSidebarOpen: boolean;
  measurements: Measurements_Grid;
  today: Dayjs;
  weekProps: WeekProps;
}

export const Grid: FC<Props> = ({
  dateCalcs,
  gridRefs,
  isSidebarOpen,
  measurements,
  today,
  weekProps,
}) => {
  const { allDayRef, mainGridRef } = gridRefs;

  return (
    <>
      <AllDayRow
        allDayRef={allDayRef}
        dateCalcs={dateCalcs}
        isSidebarOpen={isSidebarOpen}
        measurements={measurements}
        weekProps={weekProps}
      />

      <MainGrid
        dateCalcs={dateCalcs}
        isSidebarOpen={isSidebarOpen}
        mainGridRef={mainGridRef}
        measurements={measurements}
        today={today}
        weekProps={weekProps}
      />
    </>
  );
};
