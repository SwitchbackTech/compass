export interface VisualPoint {
  x: number;
  y: number;
}

export interface VisualRect {
  height: number;
  left: number;
  top: number;
  width: number;
}

export interface TimedDragVisual {
  crossSurfaceDrop?: {
    dayIndex: number;
    type: "allDay";
  } | null;
  dayIndex: number;
  durationMinutes: number;
  endMinutes: number;
  eventId: string;
  initialDayIndex: number;
  initialEndMinutes: number;
  initialStartMinutes: number;
  pointerStart: VisualPoint;
  sidebarDrop?: {
    category: string;
    index: number;
    type: "sidebar";
  } | null;
  sourceRect: VisualRect;
  startMinutes: number;
  transform: VisualPoint;
  type: "timedDrag";
  weekOffsetDays: number;
}
