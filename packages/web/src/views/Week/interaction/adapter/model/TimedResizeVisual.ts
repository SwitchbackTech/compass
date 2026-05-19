import { type VisualPoint, type VisualRect } from "./TimedDragVisual";

export type TimedResizeEdge = "endDate" | "startDate";

export interface TimedResizeVisual {
  edge: TimedResizeEdge;
  endMinutes: number;
  eventId: string;
  height: number;
  initialEdge: TimedResizeEdge;
  initialEndMinutes: number;
  initialStartMinutes: number;
  pointerStart: VisualPoint;
  sourceRect: VisualRect;
  startMinutes: number;
  transform: VisualPoint;
  type: "timedResize";
}
