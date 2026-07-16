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

/** Which of the calendar's two event rows a drag is over. */
export type CalendarDragRow = "allDay" | "timed";

/**
 * Ghost box for the row a drag is currently over. Non-null only while the drag
 * is over the *other* row, where the source card's own box is the wrong shape
 * for the event it is about to become (a 20px all-day chip over the timed grid,
 * or an hour-tall block over the all-day row).
 */
export type CrossRowSize = { height: number; width: number } | null;

/**
 * Day indices are window-relative (0..N-1 over the rendered columns) and stay
 * valid across mid-drag layout rebuilds because the visible day count is
 * frozen while an interaction is in motion. Day *dates* come from the layout
 * cache columns, so they track mid-drag week navigation automatically.
 */
export interface TimedDragVisual {
  crossRowSize: CrossRowSize;
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
  /**
   * Row the pointer is over, re-resolved every frame. "allDay" means releasing
   * here converts the event to an all-day one and `startMinutes`/`endMinutes`
   * are ignored by the commit (they keep their last in-grid values).
   */
  row: CalendarDragRow;
  sourceRect: VisualRect;
  startMinutes: number;
  transform: VisualPoint;
  type: "timedDrag";
}
