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

/**
 * Day indices are window-relative (0..N-1 over the rendered columns) and stay
 * valid across mid-drag layout rebuilds because the visible day count is
 * frozen while an interaction is in motion. Day *dates* come from the layout
 * cache columns, so they track mid-drag week navigation automatically.
 */
export interface TimedDragVisual {
  /** Local YYYY-MM-DD date of the column currently under the drag. */
  dayDate: string;
  dayIndex: number;
  durationMinutes: number;
  endMinutes: number;
  eventId: string;
  /** Local YYYY-MM-DD date of the source column at drag start. */
  initialDayDate: string;
  initialDayIndex: number;
  initialEndMinutes: number;
  initialStartMinutes: number;
  pointerStart: VisualPoint;
  sourceRect: VisualRect;
  startMinutes: number;
  transform: VisualPoint;
  type: "timedDrag";
}
