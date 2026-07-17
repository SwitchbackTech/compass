import { EVENT_ALLDAY_HEIGHT } from "@web/grid/grid.constants";
import {
  type DayColumnCache,
  type GridLayoutCache,
  getNearestDayColumn,
} from "../layout.cache";
import {
  type DragRow,
  type VisualPoint,
  type VisualRect,
} from "../types/timed-drag.types";
import { clamp, snapToStep } from "./snap";

const MINUTES_PER_DAY = 24 * 60;

/**
 * Duration invented for an all-day event dropped into the timed grid. An
 * all-day span carries no time of day and no meaningful length in minutes, so
 * the conversion has to make one up; an hour is the least surprising block to
 * hand back and is trivial for the user to resize.
 */
export const CROSS_ROW_TIMED_DURATION_MIN = 60;

interface CrossRowPlacement {
  column: DayColumnCache | null;
  height: number;
  transform: VisualPoint;
  width: number;
}

/** Splits a drag's paired layout cache back into the two rows it hit-tests against. */
export const getDragRowLayouts = (
  layout: GridLayoutCache,
  sourceRow: DragRow,
): { allDay: GridLayoutCache | null; timed: GridLayoutCache | null } =>
  sourceRow === "allDay"
    ? { allDay: layout, timed: layout.crossRow ?? null }
    : { allDay: layout.crossRow ?? null, timed: layout };

/**
 * The all-day row's own rect is the divider: inside it the drop is all-day,
 * anywhere else it lands in the timed grid. Falls back to the drag's own row
 * unless both rows are on screen, so a layout missing either one keeps its
 * existing same-row behavior instead of dropping into geometry that isn't there.
 *
 * Pure in the pointer, so re-running it at pointerup reproduces the same row.
 */
export const resolveDragRow = ({
  allDay,
  pointerY,
  sourceRow,
  timed,
}: {
  allDay: GridLayoutCache | null;
  pointerY: number;
  sourceRow: DragRow;
  timed: GridLayoutCache | null;
}): DragRow => {
  if (!allDay || !timed) {
    return sourceRow;
  }

  return pointerY >= allDay.edgeNavigation.top &&
    pointerY <= allDay.edgeNavigation.bottom
    ? "allDay"
    : "timed";
};

/**
 * Cross-row placement is absolute rather than delta-based: the column under the
 * pointer decides the day, and the ghost is moved onto that column. The same
 * column drives both the ghost and the commit, so the drop lands where the drag
 * was drawn.
 */
export const getCrossRowTimedPlacement = ({
  layout,
  pointer,
  sourceRect,
}: {
  layout: GridLayoutCache;
  pointer: VisualPoint;
  sourceRect: VisualRect;
}): CrossRowPlacement & { startMinutes: number } => {
  const column = getNearestDayColumn(layout.dayColumns, pointer.x);
  // Read live rather than trusting the cache's initialScrollTop: the grid can
  // scroll out from under a cross-row drag (the wheel, or the view's own
  // scroll-to-now on mount), and a stale offset silently desyncs the ghost's
  // position from the time it is labelled with.
  const scrollTop = layout.smartScroll?.element.scrollTop ?? 0;
  // The pointer marks the start: the block hangs below the cursor, which is
  // independent of where the (short, ~20px) all-day chip happened to be grabbed.
  const startMinutes = clamp(
    snapToStep(
      (pointer.y - layout.edgeNavigation.top + scrollTop) /
        layout.pixelsPerMinute,
      layout.snapMinutes,
    ),
    0,
    MINUTES_PER_DAY - CROSS_ROW_TIMED_DURATION_MIN,
  );

  return {
    column,
    height: CROSS_ROW_TIMED_DURATION_MIN * layout.pixelsPerMinute,
    startMinutes,
    transform: {
      x: (column?.left ?? sourceRect.left) - sourceRect.left,
      y:
        layout.edgeNavigation.top +
        startMinutes * layout.pixelsPerMinute -
        scrollTop -
        sourceRect.top,
    },
    width: column?.width ?? sourceRect.width,
  };
};

/** The all-day mirror of getCrossRowTimedPlacement: no time of day, so only a column. */
export const getCrossRowAllDayPlacement = ({
  layout,
  pointer,
  sourceRect,
}: {
  layout: GridLayoutCache;
  pointer: VisualPoint;
  sourceRect: VisualRect;
}): CrossRowPlacement => {
  const column = getNearestDayColumn(layout.dayColumns, pointer.x);

  return {
    column,
    height: EVENT_ALLDAY_HEIGHT,
    transform: {
      x: (column?.left ?? sourceRect.left) - sourceRect.left,
      y: layout.edgeNavigation.top - sourceRect.top,
    },
    width: column?.width ?? sourceRect.width,
  };
};
