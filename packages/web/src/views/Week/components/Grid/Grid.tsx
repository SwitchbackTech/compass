import { type FC } from "react";
import { type Dayjs } from "@core/util/date/dayjs";
import { AllDayRow } from "@web/views/Week/components/Grid/AllDayRow/AllDayRow";
import { EdgeNavigationIndicators } from "@web/views/Week/components/Grid/MainGrid/EdgeNavigationIndicators/EdgeNavigationIndicators";
import { MainGrid } from "@web/views/Week/components/Grid/MainGrid/MainGrid";
import { type DateCalcs } from "@web/views/Week/hooks/grid/useDateCalcs";
import { useDragEdgeNavigation } from "@web/views/Week/hooks/grid/useDragEdgeNavigation";
import {
  type Measurements_Grid,
  type Refs_Grid,
} from "@web/views/Week/hooks/grid/useGridLayout";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";

interface Props {
  dateCalcs: DateCalcs;
  gridRefs: Refs_Grid;
  measurements: Measurements_Grid;
  today: Dayjs;
  weekProps: WeekProps;
}

export const Grid: FC<Props> = ({
  dateCalcs,
  gridRefs,
  measurements,
  today,
  weekProps,
}) => {
  const {
    allDayRef,
    allDayRowRef,
    mainGridElementRef,
    mainGridRef,
    timedColumnsElementRef,
  } = gridRefs;

  useDragEdgeNavigation(mainGridRef, weekProps);

  return (
    <div
      style={{
        display: "flex",
        flex: 1,
        flexDirection: "column",
        minHeight: 0,
        width: "100%",
        position: "relative",
      }}
    >
      <AllDayRow
        allDayRef={allDayRef}
        allDayRowRef={allDayRowRef}
        dateCalcs={dateCalcs}
        measurements={measurements}
        weekProps={weekProps}
      />

      <MainGrid
        dateCalcs={dateCalcs}
        mainGridElementRef={mainGridElementRef}
        mainGridRef={mainGridRef}
        measurements={measurements}
        timedColumnsElementRef={timedColumnsElementRef}
        today={today}
        weekProps={weekProps}
      />
      <EdgeNavigationIndicators />
    </div>
  );
};
