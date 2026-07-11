import { type VisualPoint, type VisualRect } from "./TimedDragVisual";

/**
 * Day indices are window-relative (0..N-1 over the rendered columns) and stay
 * valid across mid-drag layout rebuilds because the visible day count is
 * frozen while an interaction is in motion. Day *dates* come from the layout
 * cache columns, so they track mid-drag week navigation automatically.
 */
export interface AllDayDragVisual {
  /** Local YYYY-MM-DD date of the column currently under the drag. */
  dayDate: string;
  dayIndex: number;
  eventId: string;
  /** Local YYYY-MM-DD date of the (window-clamped) source column at drag start. */
  initialDayDate: string;
  initialDayIndex: number;
  pointerStart: VisualPoint;
  sourceRect: VisualRect;
  transform: VisualPoint;
  type: "allDayDrag";
}
