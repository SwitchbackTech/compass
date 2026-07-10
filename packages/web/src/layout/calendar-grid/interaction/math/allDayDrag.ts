import { type CalendarLayoutCache } from "@web/layout/calendar-grid/interaction/calendarLayoutCache";
import { type AllDayDragVisual } from "../model/AllDayDragVisual";
import { type VisualPoint, type VisualRect } from "../model/TimedDragVisual";
import { resolveDragColumn } from "./resolveDragColumn";

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
  const { nextColumn, transformX } = resolveDragColumn({
    deltaX: pointer.x - visual.pointerStart.x,
    initialDayIndex: visual.initialDayIndex,
    layout,
    sourceRect: visual.sourceRect,
  });

  return {
    ...visual,
    dayDate: nextColumn?.date ?? visual.dayDate,
    dayIndex: nextColumn?.index ?? visual.initialDayIndex,
    transform: {
      x: transformX,
      y: 0,
    },
  };
};
