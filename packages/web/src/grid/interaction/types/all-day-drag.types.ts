import {
  type CrossRowSize,
  type DragRow,
  type VisualPoint,
  type VisualRect,
} from "./timed-drag.types";

/**
 * Day indices are window-relative (0..N-1 over the rendered columns) and stay
 * valid across mid-drag layout rebuilds because the visible day count is
 * frozen while an interaction is in motion. Day *dates* come from the layout
 * cache columns, so they track mid-drag week navigation automatically.
 */
export interface AllDayDragVisual {
  crossRowSize: CrossRowSize;
  /**
   * Local YYYY-MM-DD date of the column the ghost is snapped to. How the commit
   * reads it depends on `row`: an all-day drop applies it as a *delta* from
   * `initialDayDate` (the span may be window-clamped, so the initial column is
   * not necessarily the event's own start), while a timed drop applies it
   * absolutely, because the converted block lands on the column it was dropped
   * on and has no meaningful offset from where the span started.
   */
  /**
   * Column key semantics match TimedDragVisual.dayDate: a date in the Week
   * view, a calendar id in the Day view.
   */
  dayDate: string;
  dayIndex: number;
  eventId: string;
  /** Local YYYY-MM-DD date of the (window-clamped) source column at drag start. */
  initialDayDate: string;
  initialDayIndex: number;
  pointerStart: VisualPoint;
  /**
   * Row the pointer is over, re-resolved every frame. "timed" means releasing
   * here converts the event to a timed one.
   */
  row: DragRow;
  sourceRect: VisualRect;
  /** Snapped start-of-day minutes for the converted block; null unless `row` is "timed". */
  timedStartMinutes: number | null;
  transform: VisualPoint;
  type: "allDayDrag";
}
