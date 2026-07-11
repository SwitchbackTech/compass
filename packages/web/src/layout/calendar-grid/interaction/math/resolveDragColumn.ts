import {
  type CalendarLayoutCache,
  getNearestDayColumn,
} from "@web/layout/calendar-grid/interaction/calendarLayoutCache";
import { type VisualRect } from "../model/TimedDragVisual";

/**
 * Resolves which day column a horizontal drag is over, relative to the
 * dragged event's own column: the initial column is looked up by its
 * window-relative index (stable across mid-drag layout rebuilds), and the
 * next column is whichever is nearest to the source center shifted by the
 * pointer's horizontal delta.
 */
export const resolveDragColumn = ({
  deltaX,
  initialDayIndex,
  layout,
  sourceRect,
}: {
  deltaX: number;
  initialDayIndex: number;
  layout: CalendarLayoutCache;
  sourceRect: VisualRect;
}) => {
  const initialColumn = layout.dayColumns.find(
    (column) => column.index === initialDayIndex,
  );
  const initialColumnLeft = initialColumn?.left ?? sourceRect.left;
  const sourceCenterX =
    initialColumnLeft + (initialColumn?.width ?? sourceRect.width) / 2;
  const nextColumn = getNearestDayColumn(
    layout.dayColumns,
    sourceCenterX + deltaX,
  );

  return {
    nextColumn,
    transformX: (nextColumn?.left ?? initialColumnLeft) - initialColumnLeft,
  };
};
