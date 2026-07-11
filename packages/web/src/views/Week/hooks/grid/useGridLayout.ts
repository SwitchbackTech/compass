import { useCalendarGridLayout } from "@web/layout/calendar-grid/hooks/useCalendarGridLayout";
import { isWeekInteractionMotionActive } from "@web/views/Week/interaction/state/weekInteractionMotionState";
import { WEEK_DAY_COUNT } from "@web/views/Week/util/week-window.util";

export const useGridLayout = (visibleDateCount: number = WEEK_DAY_COUNT) =>
  useCalendarGridLayout({
    isInteractionMotionActive: isWeekInteractionMotionActive,
    visibleDateCount,
  });

export type Layout_Grid = ReturnType<typeof useGridLayout>;
export type Measurements_Grid = Layout_Grid["measurements"];
export type Refs_Grid = Layout_Grid["gridRefs"];
