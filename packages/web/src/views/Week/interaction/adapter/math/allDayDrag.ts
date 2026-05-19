import {
  getNearestDayColumn,
  type WeekLayoutCache,
} from "../geometry/weekLayoutCache";
import { type AllDayDragVisual } from "../model/AllDayDragVisual";
import { type VisualPoint, type VisualRect } from "../model/TimedDragVisual";

interface CreateAllDayDragVisualInput {
  dayIndex: number;
  eventId: string;
  pointerStart: VisualPoint;
  sourceRect: VisualRect;
}

interface UpdateAllDayDragVisualInput {
  layout: WeekLayoutCache;
  pointer: VisualPoint;
}

export const createAllDayDragVisual = ({
  dayIndex,
  eventId,
  pointerStart,
  sourceRect,
}: CreateAllDayDragVisualInput): AllDayDragVisual => ({
  dayIndex,
  eventId,
  initialDayIndex: dayIndex,
  pointerStart,
  sourceRect,
  transform: { x: 0, y: 0 },
  type: "allDayDrag",
  weekOffsetDays: 0,
});

export const updateAllDayDragVisual = (
  visual: AllDayDragVisual,
  { layout, pointer }: UpdateAllDayDragVisualInput,
): AllDayDragVisual => {
  const deltaX = pointer.x - visual.pointerStart.x;
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
    transform: {
      x: nextColumnLeft - initialColumnLeft,
      y: 0,
    },
  };
};
