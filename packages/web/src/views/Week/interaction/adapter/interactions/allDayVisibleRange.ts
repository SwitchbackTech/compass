import {
  getNearestDayColumn,
  type WeekLayoutCache,
} from "../geometry/weekLayoutCache";
import { type VisualRect } from "../model/TimedDragVisual";

export const getVisibleAllDayRange = (
  layout: WeekLayoutCache,
  sourceRect: VisualRect,
) => {
  const startColumn = getNearestDayColumn(
    layout.dayColumns,
    sourceRect.left + 1,
  );
  const endColumn = getNearestDayColumn(
    layout.dayColumns,
    sourceRect.left + Math.max(1, sourceRect.width),
  );
  const startDayIndex = startColumn?.index ?? 0;
  const endDayIndex = Math.max(
    startDayIndex,
    endColumn?.index ?? startDayIndex,
  );

  return {
    endDayIndex,
    startDayIndex,
  };
};
