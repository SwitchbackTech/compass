import {
  getNearestDayColumn,
  type WeekLayoutCache,
} from "../geometry/weekLayoutCache";
import {
  type TimedDragVisual,
  type VisualPoint,
  type VisualRect,
} from "../model/TimedDragVisual";
import { clamp, snapToStep } from "./snap";

const MINUTES_PER_DAY = 24 * 60;

interface CreateTimedDragVisualInput {
  dayIndex: number;
  endMinutes: number;
  eventId: string;
  pointerStart: VisualPoint;
  sourceRect: VisualRect;
  startMinutes: number;
}

interface UpdateTimedDragVisualInput {
  layout: WeekLayoutCache;
  pointer: VisualPoint;
  scrollDeltaPx?: number;
}

export const createTimedDragVisual = ({
  dayIndex,
  endMinutes,
  eventId,
  pointerStart,
  sourceRect,
  startMinutes,
}: CreateTimedDragVisualInput): TimedDragVisual => ({
  dayIndex,
  durationMinutes: endMinutes - startMinutes,
  endMinutes,
  eventId,
  initialDayIndex: dayIndex,
  initialEndMinutes: endMinutes,
  initialStartMinutes: startMinutes,
  pointerStart,
  sourceRect,
  startMinutes,
  transform: { x: 0, y: 0 },
  type: "timedDrag",
  weekOffsetDays: 0,
});

export const updateTimedDragVisual = (
  visual: TimedDragVisual,
  { layout, pointer, scrollDeltaPx = 0 }: UpdateTimedDragVisualInput,
): TimedDragVisual => {
  const deltaX = pointer.x - visual.pointerStart.x;
  const deltaY = pointer.y - visual.pointerStart.y;
  const pointerDeltaMinutes = snapToStep(
    deltaY / layout.pixelsPerMinute,
    layout.snapMinutes,
  );
  const deltaMinutes = snapToStep(
    (deltaY + scrollDeltaPx) / layout.pixelsPerMinute,
    layout.snapMinutes,
  );
  const latestStartMinutes = clamp(
    visual.initialStartMinutes + deltaMinutes,
    0,
    MINUTES_PER_DAY - visual.durationMinutes,
  );
  const latestEndMinutes = latestStartMinutes + visual.durationMinutes;
  const initialColumn = layout.dayColumns.find(
    (column) => column.index === visual.initialDayIndex,
  );
  const sourceCenterX =
    (initialColumn?.left ?? visual.sourceRect.left) +
    (initialColumn?.width ?? visual.sourceRect.width) / 2;
  const nextColumn = getNearestDayColumn(
    layout.dayColumns,
    sourceCenterX + deltaX,
  );
  const nextDayIndex = nextColumn?.index ?? visual.initialDayIndex;
  const initialColumnLeft = initialColumn?.left ?? visual.sourceRect.left;
  const nextColumnLeft = nextColumn?.left ?? initialColumnLeft;

  return {
    ...visual,
    dayIndex: nextDayIndex,
    endMinutes: latestEndMinutes,
    startMinutes: latestStartMinutes,
    transform: {
      x: nextColumnLeft - initialColumnLeft,
      y: pointerDeltaMinutes * layout.pixelsPerMinute,
    },
  };
};
