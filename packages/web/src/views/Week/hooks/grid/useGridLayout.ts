import { useCalendarGridLayout } from "@web/common/calendar-grid/hooks/useCalendarGridLayout";
import { isWeekInteractionMotionActive } from "@web/views/Week/interaction/state/weekInteractionMotionState";

const DAYS_IN_VIEW = 7;

export const useGridLayout = () =>
  useCalendarGridLayout({
    isInteractionMotionActive: isWeekInteractionMotionActive,
    visibleDateCount: DAYS_IN_VIEW,
  });

export type Layout_Grid = ReturnType<typeof useGridLayout>;
export type Measurements_Grid = Layout_Grid["measurements"];
export type Refs_Grid = Layout_Grid["gridRefs"];
