import { type VisualPoint, type VisualRect } from "./TimedDragVisual";

export interface AllDayDragVisual {
  dayIndex: number;
  eventId: string;
  initialDayIndex: number;
  pointerStart: VisualPoint;
  sourceRect: VisualRect;
  transform: VisualPoint;
  type: "allDayDrag";
  weekOffsetDays: number;
}
