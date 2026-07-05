import {
  type CalendarLayoutCache,
  getNearestDayColumn,
} from "@web/common/calendar-grid/interaction/calendarLayoutCache";
import { type AllDayDragVisual } from "../model/AllDayDragVisual";
import { type VisualPoint, type VisualRect } from "../model/TimedDragVisual";

interface CreateAllDayDragVisualInput {
  dayDate: string;
  dayIndex: number;
  eventId: string;
  pointerStart: VisualPoint;
  sourceRect: VisualRect;
}

interface UpdateAllDayDragVisualInput {
  layout: CalendarLayoutCache;
  pointer: VisualPoint;
}

export const createAllDayDragVisual = ({
  dayDate,
  dayIndex,
  eventId,
  pointerStart,
  sourceRect,
}: CreateAllDayDragVisualInput): AllDayDragVisual => ({
  dayDate,
  dayIndex,
  eventId,
  initialDayDate: dayDate,
  initialDayIndex: dayIndex,
  pointerStart,
  sourceRect,
  transform: { x: 0, y: 0 },
  type: "allDayDrag",
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
    dayDate: nextColumn?.date ?? visual.dayDate,
    dayIndex: nextDayIndex,
    transform: {
      x: nextColumnLeft - initialColumnLeft,
      y: 0,
    },
  };
};
