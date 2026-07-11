import dayjs from "@core/util/date/dayjs";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { type TimedDragVisual } from "@web/layout/calendar-grid/interaction/model/TimedDragVisual";
import { type TimedResizeVisual } from "@web/layout/calendar-grid/interaction/model/TimedResizeVisual";

export const hasTimedDragVisualMoved = (visual: TimedDragVisual) =>
  visual.dayDate !== visual.initialDayDate ||
  visual.startMinutes !== visual.initialStartMinutes ||
  visual.endMinutes !== visual.initialEndMinutes;

export const timedDragVisualToGridEvent = (
  event: Schema_GridEvent,
  visual: TimedDragVisual,
): Schema_GridEvent => {
  // The column under the drag knows its own date, so the target day is
  // assigned absolutely; time-of-day rides on the visual's minutes.
  const movedDay = dayjs(visual.dayDate).startOf("day");

  return {
    ...event,
    endDate: movedDay.add(visual.endMinutes, "minutes").format(),
    startDate: movedDay.add(visual.startMinutes, "minutes").format(),
  };
};

export const hasTimedResizeVisualMoved = (visual: TimedResizeVisual) =>
  visual.startMinutes !== visual.initialStartMinutes ||
  visual.endMinutes !== visual.initialEndMinutes;

export const timedResizeVisualToGridEvent = (
  event: Schema_GridEvent,
  visual: TimedResizeVisual,
): Schema_GridEvent => {
  const resizedDay = dayjs(event.startDate).startOf("day");

  return {
    ...event,
    endDate: resizedDay.add(visual.endMinutes, "minutes").format(),
    startDate: resizedDay.add(visual.startMinutes, "minutes").format(),
  };
};
