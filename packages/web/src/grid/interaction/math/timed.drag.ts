import { type GridLayoutCache } from "@web/grid/interaction/layout.cache";
import {
  type TimedDragVisual,
  type VisualPoint,
  type VisualRect,
} from "../types/timed-drag.types";
import {
  getCrossRowAllDayPlacement,
  getDragRowLayouts,
  resolveDragRow,
} from "./cross-row.drag";
import { resolveDragColumn } from "./drag-column";
import { clamp, snapToStep } from "./snap";

const MINUTES_PER_DAY = 24 * 60;

interface CreateTimedDragVisualInput {
  dayDate: string;
  dayIndex: number;
  endMinutes: number;
  eventId: string;
  pointerStart: VisualPoint;
  sourceRect: VisualRect;
  startMinutes: number;
}

interface UpdateTimedDragVisualInput {
  layout: GridLayoutCache;
  pointer: VisualPoint;
  scrollDeltaPx?: number;
}

export const createTimedDragVisual = ({
  dayDate,
  dayIndex,
  endMinutes,
  eventId,
  pointerStart,
  sourceRect,
  startMinutes,
}: CreateTimedDragVisualInput): TimedDragVisual => ({
  crossRowSize: null,
  dayDate,
  dayIndex,
  durationMinutes: endMinutes - startMinutes,
  endMinutes,
  eventId,
  initialDayDate: dayDate,
  initialDayIndex: dayIndex,
  initialEndMinutes: endMinutes,
  initialStartMinutes: startMinutes,
  pointerStart,
  row: "timed",
  sourceRect,
  startMinutes,
  transform: { x: 0, y: 0 },
  type: "timedDrag",
});

export const updateTimedDragVisual = (
  visual: TimedDragVisual,
  { layout, pointer, scrollDeltaPx = 0 }: UpdateTimedDragVisualInput,
): TimedDragVisual => {
  const { allDay, timed } = getDragRowLayouts(layout, "timed");
  const row = resolveDragRow({
    allDay,
    pointerY: pointer.y,
    sourceRow: "timed",
    timed,
  });

  // Over the all-day row the ghost becomes an all-day chip on the drop column.
  // startMinutes/endMinutes keep their last in-grid values and are ignored by
  // the commit, which reads `row` and discards the time of day.
  if (row === "allDay" && allDay) {
    const placement = getCrossRowAllDayPlacement({
      layout: allDay,
      pointer,
      sourceRect: visual.sourceRect,
    });

    return {
      ...visual,
      crossRowSize: { height: placement.height, width: placement.width },
      dayDate: placement.column?.date ?? visual.dayDate,
      dayIndex: placement.column?.index ?? visual.dayIndex,
      row: "allDay",
      transform: placement.transform,
    };
  }

  const deltaX = pointer.x - visual.pointerStart.x;
  const deltaY = pointer.y - visual.pointerStart.y;
  const deltaMinutes = snapToStep(
    (deltaY + scrollDeltaPx) / layout.pixelsPerMinute,
    layout.snapMinutes,
  );
  const candidateStartMinutes = visual.initialStartMinutes + deltaMinutes;
  const verticalPlacement = getBoundedVerticalPlacement({
    candidateStartMinutes,
    layout,
    scrollDeltaPx,
    visual,
  });
  const { nextColumn, transformX } = resolveDragColumn({
    deltaX,
    initialDayIndex: visual.initialDayIndex,
    layout,
    sourceRect: visual.sourceRect,
  });

  return {
    ...visual,
    crossRowSize: null,
    dayDate: nextColumn?.date ?? visual.dayDate,
    dayIndex: nextColumn?.index ?? visual.initialDayIndex,
    endMinutes: verticalPlacement.startMinutes + visual.durationMinutes,
    row: "timed",
    startMinutes: verticalPlacement.startMinutes,
    transform: {
      x: transformX,
      y: verticalPlacement.transformY,
    },
  };
};

const getBoundedVerticalPlacement = ({
  candidateStartMinutes,
  layout,
  scrollDeltaPx,
  visual,
}: {
  candidateStartMinutes: number;
  layout: GridLayoutCache;
  scrollDeltaPx: number;
  visual: TimedDragVisual;
}) => {
  const currentScrollTop = getCurrentScrollTop(layout, scrollDeltaPx);
  const visibleStartMinutes = currentScrollTop / layout.pixelsPerMinute;
  const visibleDurationMinutes =
    (layout.edgeNavigation.bottom - layout.edgeNavigation.top) /
    layout.pixelsPerMinute;
  const latestDayStartMinutes = MINUTES_PER_DAY - visual.durationMinutes;
  const earliestVisibleStartMinutes =
    Math.ceil(visibleStartMinutes / layout.snapMinutes) * layout.snapMinutes;
  const latestVisibleStartMinutes =
    Math.floor(
      (visibleStartMinutes + visibleDurationMinutes - visual.durationMinutes) /
        layout.snapMinutes,
    ) * layout.snapMinutes;
  const earliestStartMinutes = clamp(
    earliestVisibleStartMinutes,
    0,
    latestDayStartMinutes,
  );
  const latestStartMinutes = Math.max(
    earliestStartMinutes,
    clamp(latestVisibleStartMinutes, 0, latestDayStartMinutes),
  );
  const earliestTransformY = layout.edgeNavigation.top - visual.sourceRect.top;
  const latestTransformY = Math.max(
    earliestTransformY,
    layout.edgeNavigation.bottom -
      visual.sourceRect.height -
      visual.sourceRect.top,
  );

  if (candidateStartMinutes < earliestStartMinutes) {
    return {
      startMinutes: earliestStartMinutes,
      transformY: earliestTransformY,
    };
  }

  if (candidateStartMinutes > latestStartMinutes) {
    return {
      startMinutes: latestStartMinutes,
      transformY: latestTransformY,
    };
  }

  const timeTransformY =
    layout.edgeNavigation.top +
    candidateStartMinutes * layout.pixelsPerMinute -
    currentScrollTop -
    visual.sourceRect.top;

  return {
    startMinutes: candidateStartMinutes,
    transformY: clamp(timeTransformY, earliestTransformY, latestTransformY),
  };
};

const getCurrentScrollTop = (layout: GridLayoutCache, scrollDeltaPx: number) =>
  (layout.smartScroll?.initialScrollTop ?? 0) + scrollDeltaPx;
