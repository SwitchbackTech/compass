import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { type Dayjs } from "@core/util/date/dayjs";
import { type GridEvent } from "@web/common/types/web.event.types";
import { type AllDayDragVisual } from "@web/grid/interaction/types/all-day-drag.types";
import { type AllDayResizeVisual } from "@web/grid/interaction/types/all-day-resize.types";
import {
  type DayAllDayDragCommitResult,
  type DayAllDayDragTarget,
  type DayAllDayResizeCommitResult,
  type DayAllDayResizeTarget,
} from "../day-interaction.adapter.types";
import { columnMoveCalendarId } from "./timed.commit";

export const commitAllDayDragInteraction = (
  target: DayAllDayDragTarget,
  visual: AllDayDragVisual,
): DayAllDayDragCommitResult => {
  const hasMoved =
    "dayDate" in visual ? visual.dayDate !== visual.initialDayDate : false;

  // In the Day view every column shares the visible date, so an all-day drag
  // that "moved" can only have changed COLUMN, i.e. calendar. Keep the
  // event's own dates: rewriting them to the visible date would truncate a
  // multi-day all-day event to a single day.
  return {
    event: hasMoved
      ? {
          ...target.event,
          calendarId: columnMoveCalendarId(visual, target.event),
        }
      : target.event,
    eventId: target.event._id!,
    hadFormOpenBeforeInteraction: target.hadFormOpenBeforeInteraction,
    hasMoved,
    type: "allDayDragEnd",
  };
};

export const commitAllDayResizeInteraction = (
  target: DayAllDayResizeTarget,
  visual: AllDayResizeVisual,
  visibleDate: Dayjs,
): DayAllDayResizeCommitResult => {
  const hasMoved =
    visual.startDayIndex !== visual.initialStartDayIndex ||
    visual.endDayIndex !== visual.initialEndDayIndex;

  return {
    event: hasMoved
      ? allDayVisualToDayGridEvent(target.event, visibleDate)
      : target.event,
    eventId: target.event._id!,
    hadFormOpenBeforeInteraction: target.hadFormOpenBeforeInteraction,
    hasMoved,
    type: "allDayResizeEnd",
  };
};

const allDayVisualToDayGridEvent = (
  event: GridEvent,
  visibleDate: Dayjs,
): GridEvent => ({
  ...event,
  isAllDay: true,
  endDate: visibleDate.add(1, "day").format(YEAR_MONTH_DAY_FORMAT),
  startDate: visibleDate.format(YEAR_MONTH_DAY_FORMAT),
});
