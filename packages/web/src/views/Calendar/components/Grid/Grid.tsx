import React, { FC } from "react";
import { Dayjs } from "dayjs";
import { AbsoluteOverflowLoader } from "@web/components/AbsoluteOverflowLoader";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { AllDayRow } from "@web/views/Calendar/components/Grid/AllDayRow";
import { MainGrid } from "@web/views/Calendar/components/Grid/MainGrid";
import { Refs_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";

import { Draft } from "../Event/Draft";

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
  // const [isLoading, setIsLoading] = useState(false);
  // selectIsEventProcessing,
  // const isProcessing = useSelector(selectIsProcessing);

  const { allDayRef, gridScrollRef, mainGridRef } = gridRefs;

  return (
    <>
      {/* {isProcessing && <AbsoluteOverflowLoader />} */}

      <Draft
        dateCalcs={dateCalcs}
        isSidebarOpen={isSidebarOpen}
        measurements={measurements}
        weekProps={weekProps}
      />

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
        scrollRef={gridScrollRef}
        today={today}
        weekProps={weekProps}
      />
    </>
  );
};
