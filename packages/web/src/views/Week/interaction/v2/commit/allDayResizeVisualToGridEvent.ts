import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import dayjs from "@core/util/date/dayjs";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { type AllDayResizeVisual } from "../model/AllDayResizeVisual";

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
  const spanDays = visual.endDayIndex - visual.startDayIndex + 1;
  const startDate = dayjs(event.startDate).add(startDayDelta, "day");

  return {
    ...event,
    endDate: startDate.add(spanDays, "day").format(YEAR_MONTH_DAY_FORMAT),
    startDate: startDate.format(YEAR_MONTH_DAY_FORMAT),
  };
};
