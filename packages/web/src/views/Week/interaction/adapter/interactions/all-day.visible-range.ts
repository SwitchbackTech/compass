import {
  type GridLayoutCache,
  getNearestDayColumn,
} from "@web/grid/interaction/layout.cache";
import { type VisualRect } from "@web/grid/interaction/types/timed-drag.types";

export const getVisibleAllDayRange = (
  layout: GridLayoutCache,
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
