import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import dayjs from "@core/util/date/dayjs";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { type AllDayDragVisual } from "../model/AllDayDragVisual";
import { type AllDayResizeVisual } from "../model/AllDayResizeVisual";

export const hasAllDayDragVisualMoved = (visual: AllDayDragVisual) =>
  visual.dayIndex !== visual.initialDayIndex || visual.weekOffsetDays !== 0;

export const allDayDragVisualToGridEvent = (
  event: Schema_GridEvent,
  visual: AllDayDragVisual,
): Schema_GridEvent => {
  const dayDelta =
    visual.dayIndex - visual.initialDayIndex + visual.weekOffsetDays;

  return {
    ...event,
    endDate: dayjs(event.endDate)
      .add(dayDelta, "day")
      .format(YEAR_MONTH_DAY_FORMAT),
    startDate: dayjs(event.startDate)
      .add(dayDelta, "day")
      .format(YEAR_MONTH_DAY_FORMAT),
  };
};

export const hasAllDayResizeVisualChanged = (visual: AllDayResizeVisual) =>
  visual.startDayIndex !== visual.initialStartDayIndex ||
  visual.endDayIndex !== visual.initialEndDayIndex;

export const allDayResizeVisualToGridEvent = (
  event: Schema_GridEvent,
  visual: AllDayResizeVisual,
): Schema_GridEvent => {
  if (!hasAllDayResizeVisualChanged(visual)) {
    return event;
  }

  const startDayDelta = visual.startDayIndex - visual.initialStartDayIndex;
  const endDayDelta = visual.endDayIndex - visual.initialEndDayIndex;
  const startDate = dayjs(event.startDate).add(startDayDelta, "day");
  const baseEndDate = getExclusiveEndDateBaseline(event);

  return {
    ...event,
    endDate: baseEndDate.add(endDayDelta, "day").format(YEAR_MONTH_DAY_FORMAT),
    startDate: startDate.format(YEAR_MONTH_DAY_FORMAT),
  };
};

const getExclusiveEndDateBaseline = (event: Schema_GridEvent) => {
  const startDate = dayjs(event.startDate).startOf("day");
  const endDate = dayjs(event.endDate).startOf("day");

  return endDate.diff(startDate, "day") <= 0
    ? startDate.add(1, "day")
    : endDate;
};
