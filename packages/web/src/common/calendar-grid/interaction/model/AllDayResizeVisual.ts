import { type VisualPoint, type VisualRect } from "./TimedDragVisual";

export type AllDayResizeEdge = "endDate" | "startDate";

export interface AllDayResizeVisual {
  activeEdge: AllDayResizeEdge;
  endDayIndex: number;
  eventId: string;
  initialEndDayIndex: number;
  initialStartDayIndex: number;
  pointerStart: VisualPoint;
  sourceRect: VisualRect;
  startDayIndex: number;
  transform: VisualPoint;
  type: "allDayResize";
  width: number;
}
