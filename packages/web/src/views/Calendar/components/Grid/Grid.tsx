import { type FC } from "react";
import { type Dayjs } from "@core/util/date/dayjs";
import { AllDayRow } from "@web/views/Calendar/components/Grid/AllDayRow";
import { MainGrid } from "@web/views/Calendar/components/Grid/MainGrid";
import { EdgeNavigationIndicators } from "@web/views/Calendar/components/Grid/MainGrid/EdgeNavigationIndicators";
import { type DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { useDragEdgeNavigation } from "@web/views/Calendar/hooks/grid/useDragEdgeNavigation";
import {
  type Measurements_Grid,
  type Refs_Grid,
} from "@web/views/Calendar/hooks/grid/useGridLayout";
import { type WeekProps } from "@web/views/Calendar/hooks/useWeek";

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
  const { allDayRef, allDayRowRef, mainGridElementRef, mainGridRef } = gridRefs;

  // Handle drag-to-edge navigation for both timed and all-day events
  const dragEdgeState = useDragEdgeNavigation(mainGridRef, weekProps);

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
        today={today}
        weekProps={weekProps}
      />
      <EdgeNavigationIndicators dragEdgeState={dragEdgeState} />
    </div>
  );
};
