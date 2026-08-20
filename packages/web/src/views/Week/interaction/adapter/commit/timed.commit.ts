import { type GridEvent } from "@web/common/types/web.event.types";
import {
  hasTimedDragVisualMoved,
  hasTimedResizeVisualMoved,
} from "@web/grid/interaction/commit/timed-moved";
import { type TimedDragVisual } from "@web/grid/interaction/types/timed-drag.types";
import { type TimedResizeVisual } from "@web/grid/interaction/types/timed-resize.types";
import {
  calendarDateInEffectiveTimeZone,
  inEffectiveTimeZone,
} from "@web/timezone/in-time-zone";

export { hasTimedDragVisualMoved, hasTimedResizeVisualMoved };

export const timedDragVisualToGridEvent = (
  event: GridEvent,
  visual: TimedDragVisual,
): GridEvent => {
  // The column under the drag knows its own date, so the target day is
  // assigned absolutely; time-of-day rides on the visual's minutes.
  const movedDay = /^\d{4}-\d{2}-\d{2}$/.test(visual.dayDate)
    ? calendarDateInEffectiveTimeZone(visual.dayDate)
    : inEffectiveTimeZone(event.startDate).startOf("day");

  return {
    ...event,
    endDate: movedDay.add(visual.endMinutes, "minutes").format(),
    startDate: movedDay.add(visual.startMinutes, "minutes").format(),
  };
};

export const timedResizeVisualToGridEvent = (
  event: GridEvent,
  visual: TimedResizeVisual,
): GridEvent => {
  const resizedDay = inEffectiveTimeZone(event.startDate).startOf("day");

  return {
    ...event,
    endDate: resizedDay.add(visual.endMinutes, "minutes").format(),
    startDate: resizedDay.add(visual.startMinutes, "minutes").format(),
  };
};
