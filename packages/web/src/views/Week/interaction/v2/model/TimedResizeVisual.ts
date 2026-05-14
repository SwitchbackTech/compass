import { type VisualPoint, type VisualRect } from "./TimedDragVisual";

export type TimedResizeEdge = "startDate" | "endDate";

export interface TimedResizeVisual {
  activeEdge: TimedResizeEdge;
  dayIndex: number;
  durationMinutes: number;
  endMinutes: number;
  eventId: string;
  initialEndMinutes: number;
  initialStartMinutes: number;
  pointerStart: VisualPoint;
  sourceRect: VisualRect;
  startMinutes: number;
  transform: VisualPoint;
  type: "timedResize";
}
