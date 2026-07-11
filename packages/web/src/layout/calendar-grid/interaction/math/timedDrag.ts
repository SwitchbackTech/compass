import { type CalendarLayoutCache } from "@web/layout/calendar-grid/interaction/calendarLayoutCache";
import {
  type TimedDragVisual,
  type VisualPoint,
  type VisualRect,
} from "../model/TimedDragVisual";
import { resolveDragColumn } from "./resolveDragColumn";
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
  layout: CalendarLayoutCache;
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
  sourceRect,
  startMinutes,
  transform: { x: 0, y: 0 },
  type: "timedDrag",
});

export const updateTimedDragVisual = (
  visual: TimedDragVisual,
  { layout, pointer, scrollDeltaPx = 0 }: UpdateTimedDragVisualInput,
): TimedDragVisual => {
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
    dayDate: nextColumn?.date ?? visual.dayDate,
    dayIndex: nextColumn?.index ?? visual.initialDayIndex,
    endMinutes: verticalPlacement.startMinutes + visual.durationMinutes,
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
  layout: CalendarLayoutCache;
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

const getCurrentScrollTop = (
  layout: CalendarLayoutCache,
  scrollDeltaPx: number,
) => (layout.smartScroll?.initialScrollTop ?? 0) + scrollDeltaPx;
