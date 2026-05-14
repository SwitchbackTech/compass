import dayjs from "@core/util/date/dayjs";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { type TimedDragVisual } from "../model/TimedDragVisual";

export const hasTimedDragVisualMoved = (visual: TimedDragVisual) =>
  visual.dayIndex !== visual.initialDayIndex ||
  visual.startMinutes !== visual.initialStartMinutes ||
  visual.endMinutes !== visual.initialEndMinutes;

export const visualDraftToGridEvent = (
  event: Schema_GridEvent,
  visual: TimedDragVisual,
): Schema_GridEvent => {
  const dayDelta = visual.dayIndex - visual.initialDayIndex;
  const movedDay = dayjs(event.startDate).add(dayDelta, "day").startOf("day");

  return {
    ...event,
    endDate: movedDay.add(visual.endMinutes, "minutes").format(),
    startDate: movedDay.add(visual.startMinutes, "minutes").format(),
  };
};
