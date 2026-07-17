import { useGridMeasurements } from "@web/grid/hooks/useGridMeasurements";
import { isWeekInteractionMotionActive } from "@web/views/Week/interaction/state/motion.state";
import { WEEK_DAY_COUNT } from "@web/views/Week/util/week-window.util";

export const useGridLayout = (visibleDateCount: number = WEEK_DAY_COUNT) =>
  useGridMeasurements({
    isInteractionMotionActive: isWeekInteractionMotionActive,
    visibleDateCount,
  });

export type Layout_Grid = ReturnType<typeof useGridLayout>;
export type Measurements_Grid = Layout_Grid["measurements"];
export type Refs_Grid = Layout_Grid["gridRefs"];
