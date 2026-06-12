import { type VisualPoint, type VisualRect } from "./TimedDragVisual";

export interface AllDayDragVisual {
  crossSurfaceDrop?: {
    dayIndex: number;
    startMinutes: number;
    type: "timed";
  } | null;
  dayIndex: number;
  eventId: string;
  initialDayIndex: number;
  pointerStart: VisualPoint;
  sidebarDrop?: {
    category: string;
    index: number;
    type: "sidebar";
  } | null;
  sourceRect: VisualRect;
  transform: VisualPoint;
  type: "allDayDrag";
  weekOffsetDays: number;
}
