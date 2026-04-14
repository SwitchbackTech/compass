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
import { GRID_PADDING_BOTTOM } from "../../layout.constants";

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

  // Handle drag-to-edge navigation for both timed and all-day events
  const dragEdgeState = useDragEdgeNavigation(mainGridRef, weekProps);

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        position: "relative",
        paddingBottom: GRID_PADDING_BOTTOM,
      }}
    >
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
      <EdgeNavigationIndicators dragEdgeState={dragEdgeState} />
    </div>
  );
};
