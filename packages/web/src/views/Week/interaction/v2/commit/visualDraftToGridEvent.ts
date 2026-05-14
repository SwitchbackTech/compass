import dayjs from "@core/util/date/dayjs";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { type TimedDragVisual } from "../model/TimedDragVisual";
import { type TimedResizeVisual } from "../model/TimedResizeVisual";

type TimedEventVisual = TimedDragVisual | TimedResizeVisual;

export const hasTimedDragVisualMoved = (visual: TimedDragVisual) =>
  hasTimedEventVisualChanged(visual);

export const hasTimedEventVisualChanged = (visual: TimedEventVisual) =>
  ("initialDayIndex" in visual
    ? visual.dayIndex !== visual.initialDayIndex || visual.weekOffsetDays !== 0
    : false) ||
  visual.startMinutes !== visual.initialStartMinutes ||
  visual.endMinutes !== visual.initialEndMinutes;

export const visualDraftToGridEvent = (
  event: Schema_GridEvent,
  visual: TimedEventVisual,
): Schema_GridEvent => {
  const dayDelta =
    "initialDayIndex" in visual
      ? visual.dayIndex - visual.initialDayIndex + visual.weekOffsetDays
      : 0;
  const movedDay = dayjs(event.startDate).add(dayDelta, "day").startOf("day");

  return {
    ...event,
    endDate: movedDay.add(visual.endMinutes, "minutes").format(),
    startDate: movedDay.add(visual.startMinutes, "minutes").format(),
  };
};
