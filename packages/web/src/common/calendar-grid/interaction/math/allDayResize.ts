import {
  type CalendarDayColumnCache,
  type CalendarLayoutCache,
  getNearestDayColumn,
} from "@web/common/calendar-grid/interaction/calendarLayoutCache";
import {
  type AllDayResizeEdge,
  type AllDayResizeVisual,
} from "../model/AllDayResizeVisual";
import { type VisualPoint, type VisualRect } from "../model/TimedDragVisual";

interface CreateAllDayResizeVisualInput {
  edge: AllDayResizeEdge;
  endDayIndex: number;
  eventId: string;
  pointerStart: VisualPoint;
  sourceRect: VisualRect;
  startDayIndex: number;
}

interface UpdateAllDayResizeVisualInput {
  layout: CalendarLayoutCache;
  pointer: VisualPoint;
}

export const createAllDayResizeVisual = ({
  edge,
  endDayIndex,
  eventId,
  pointerStart,
  sourceRect,
  startDayIndex,
}: CreateAllDayResizeVisualInput): AllDayResizeVisual => ({
  activeEdge: edge,
  endDayIndex,
  eventId,
  initialEndDayIndex: endDayIndex,
  initialStartDayIndex: startDayIndex,
  pointerStart,
  sourceRect,
  startDayIndex,
  transform: { x: 0, y: 0 },
  type: "allDayResize",
  width: sourceRect.width,
});

export const updateAllDayResizeVisual = (
  visual: AllDayResizeVisual,
  { layout, pointer }: UpdateAllDayResizeVisualInput,
): AllDayResizeVisual => {
  const pointerColumn = getNearestDayColumn(layout.dayColumns, pointer.x);
  const pointerDayIndex = pointerColumn?.index ?? visual.initialStartDayIndex;
  const nextRange =
    visual.activeEdge === "startDate"
      ? resizeFromStart(visual, pointerDayIndex)
      : resizeFromEnd(visual, pointerDayIndex);
  const initialStartColumn = getColumn(
    layout.dayColumns,
    visual.initialStartDayIndex,
  );
  const nextStartColumn = getColumn(layout.dayColumns, nextRange.startDayIndex);
  const initialSpanWidth = getSpanWidth(
    layout.dayColumns,
    visual.initialStartDayIndex,
    visual.initialEndDayIndex,
  );
  const currentSpanWidth = getSpanWidth(
    layout.dayColumns,
    nextRange.startDayIndex,
    nextRange.endDayIndex,
  );
  const sourcePadding = Math.max(0, initialSpanWidth - visual.sourceRect.width);

  return {
    ...visual,
    activeEdge: nextRange.activeEdge,
    endDayIndex: nextRange.endDayIndex,
    startDayIndex: nextRange.startDayIndex,
    transform: {
      x: (nextStartColumn?.left ?? 0) - (initialStartColumn?.left ?? 0),
      y: 0,
    },
    width: Math.max(1, currentSpanWidth - sourcePadding),
  };
};

const resizeFromStart = (
  visual: AllDayResizeVisual,
  pointerDayIndex: number,
) => {
  if (pointerDayIndex <= visual.initialEndDayIndex) {
    return {
      activeEdge: "startDate" as const,
      endDayIndex: visual.initialEndDayIndex,
      startDayIndex: pointerDayIndex,
    };
  }

  return {
    activeEdge: "endDate" as const,
    endDayIndex: pointerDayIndex,
    startDayIndex: visual.initialEndDayIndex,
  };
};

const resizeFromEnd = (visual: AllDayResizeVisual, pointerDayIndex: number) => {
  if (pointerDayIndex >= visual.initialStartDayIndex) {
    return {
      activeEdge: "endDate" as const,
      endDayIndex: pointerDayIndex,
      startDayIndex: visual.initialStartDayIndex,
    };
  }

  return {
    activeEdge: "startDate" as const,
    endDayIndex: visual.initialStartDayIndex,
    startDayIndex: pointerDayIndex,
  };
};

const getColumn = (columns: CalendarDayColumnCache[], dayIndex: number) =>
  columns.find((column) => column.index === dayIndex);

const getSpanWidth = (
  columns: CalendarDayColumnCache[],
  startDayIndex: number,
  endDayIndex: number,
) =>
  columns
    .filter(
      (column) => column.index >= startDayIndex && column.index <= endDayIndex,
    )
    .reduce((width, column) => width + column.width, 0);
