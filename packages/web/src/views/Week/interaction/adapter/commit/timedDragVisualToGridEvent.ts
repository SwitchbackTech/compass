import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import dayjs from "@core/util/date/dayjs";
import { type TimedDragVisual } from "@web/common/calendar-grid/interaction/model/TimedDragVisual";
import { type TimedResizeVisual } from "@web/common/calendar-grid/interaction/model/TimedResizeVisual";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";

export const hasTimedDragVisualMoved = (visual: TimedDragVisual) =>
  visual.crossSurfaceDrop?.type === "allDay" ||
  visual.dayIndex !== visual.initialDayIndex ||
  visual.weekOffsetDays !== 0 ||
  visual.startMinutes !== visual.initialStartMinutes ||
  visual.endMinutes !== visual.initialEndMinutes;

export const timedDragVisualToGridEvent = (
  event: Schema_GridEvent,
  visual: TimedDragVisual,
): Schema_GridEvent => {
  if (visual.crossSurfaceDrop?.type === "allDay") {
    const dayDelta =
      visual.crossSurfaceDrop.dayIndex -
      visual.initialDayIndex +
      visual.weekOffsetDays;
    const movedDay = dayjs(event.startDate).add(dayDelta, "day").startOf("day");

    return {
      ...event,
      endDate: movedDay.add(1, "day").format(YEAR_MONTH_DAY_FORMAT),
      isAllDay: true,
      startDate: movedDay.format(YEAR_MONTH_DAY_FORMAT),
    };
  }

  const dayDelta =
    visual.dayIndex - visual.initialDayIndex + visual.weekOffsetDays;
  const movedDay = dayjs(event.startDate).add(dayDelta, "day").startOf("day");

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
