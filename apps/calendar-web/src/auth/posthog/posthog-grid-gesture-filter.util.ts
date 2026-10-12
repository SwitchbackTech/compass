import { type CaptureResult } from "posthog-js";
import { isPosthogEventOnCalendarGrid } from "@web/auth/posthog/posthog-calendar-grid.util";

const GRID_GESTURE_EVENTS = new Set([
  "$dead_click",
  "$dead_swipe",
  "$rageclick",
]);

/**
 * Empty grid clicks are keyboard-teaching gestures: they may not mutate the
 * DOM, but they are intentional. Drop dead/rage autocapture when the target
 * is the calendar grid so PostHog does not treat learning clicks as errors.
 */
export function filterPosthogCalendarGridGestures(
  event: CaptureResult | null,
): CaptureResult | null {
  if (!event) return event;
  if (!GRID_GESTURE_EVENTS.has(event.event)) return event;

  const properties = event.properties;
  if (!properties || typeof properties !== "object") return event;

  return isPosthogEventOnCalendarGrid(properties as Record<string, unknown>)
    ? null
    : event;
}
