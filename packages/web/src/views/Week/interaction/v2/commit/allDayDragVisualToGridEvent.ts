import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import dayjs from "@core/util/date/dayjs";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { type AllDayDragVisual } from "../model/AllDayDragVisual";

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
