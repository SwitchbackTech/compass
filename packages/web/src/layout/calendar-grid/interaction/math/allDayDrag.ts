import { type CalendarLayoutCache } from "@web/layout/calendar-grid/interaction/calendarLayoutCache";
import { type AllDayDragVisual } from "../model/AllDayDragVisual";
import { type VisualPoint, type VisualRect } from "../model/TimedDragVisual";
import {
  getCalendarDragRowLayouts,
  getCrossRowTimedPlacement,
  resolveCalendarDragRow,
} from "./crossRowDrag";
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
  crossRowSize: null,
  dayDate,
  dayIndex,
  eventId,
  initialDayDate: dayDate,
  initialDayIndex: dayIndex,
  pointerStart,
  row: "allDay",
  sourceRect,
  timedStartMinutes: null,
  transform: { x: 0, y: 0 },
  type: "allDayDrag",
});

export const updateAllDayDragVisual = (
  visual: AllDayDragVisual,
  { layout, pointer }: UpdateAllDayDragVisualInput,
): AllDayDragVisual => {
  const { allDay, timed } = getCalendarDragRowLayouts(layout, "allDay");
  const row = resolveCalendarDragRow({
    allDay,
    pointerY: pointer.y,
    sourceRow: "allDay",
    timed,
  });

  // Over the timed grid the drag is no longer horizontally locked: the ghost
  // becomes a default-length block placed at the pointer, previewing the timed
  // event this drop would create.
  if (row === "timed" && timed) {
    const placement = getCrossRowTimedPlacement({
      layout: timed,
      pointer,
      sourceRect: visual.sourceRect,
    });

    return {
      ...visual,
      crossRowSize: { height: placement.height, width: placement.width },
      dayDate: placement.column?.date ?? visual.dayDate,
      dayIndex: placement.column?.index ?? visual.dayIndex,
      row: "timed",
      timedStartMinutes: placement.startMinutes,
      transform: placement.transform,
    };
  }

  const { nextColumn, transformX } = resolveDragColumn({
    deltaX: pointer.x - visual.pointerStart.x,
    initialDayIndex: visual.initialDayIndex,
    layout: allDay ?? layout,
    sourceRect: visual.sourceRect,
  });

  return {
    ...visual,
    crossRowSize: null,
    dayDate: nextColumn?.date ?? visual.dayDate,
    dayIndex: nextColumn?.index ?? visual.initialDayIndex,
    row: "allDay",
    timedStartMinutes: null,
    transform: {
      x: transformX,
      y: 0,
    },
  };
};
