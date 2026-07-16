import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import dayjs from "@core/util/date/dayjs";
import { type CalendarInteractionPoint } from "@web/interaction/CalendarInteractionSession";
import { getLocalMinutes } from "@web/layout/calendar-grid/interaction/calendarInteractionDate";
import { timedDragVisualToAllDayGridEvent } from "@web/layout/calendar-grid/interaction/commit/crossRowVisualToGridEvent";
import {
  createTimedDragVisual,
  updateTimedDragVisual,
} from "@web/layout/calendar-grid/interaction/math/timedDrag";
import {
  type TimedDragVisual,
  type VisualPoint,
  type VisualRect,
} from "@web/layout/calendar-grid/interaction/model/TimedDragVisual";
import {
  hasTimedDragVisualMoved,
  timedDragVisualToGridEvent,
} from "../commit/timedDragVisualToGridEvent";
import {
  getNearestDayColumn,
  type WeekLayoutCache,
} from "../geometry/weekLayoutCache";
import {
  type WeekTimedDragCommitResult,
  type WeekTimedDragTarget,
} from "../WeekInteractionAdapter.types";

export const createTimedDragInteractionVisual = ({
  layout,
  pointerStart,
  sourceRect,
  target,
}: {
  layout: WeekLayoutCache;
  pointerStart: CalendarInteractionPoint;
  sourceRect: VisualRect;
  target: WeekTimedDragTarget;
}) => {
  // Timed events render in the column of their start date, so the date lookup
  // is exact; the geometric nearest-column fallback is belt-and-braces.
  const startDateKey = dayjs(target.event.startDate).format(
    YEAR_MONTH_DAY_FORMAT,
  );
  const sourceColumn =
    layout.dayColumns.find((column) => column.date === startDateKey) ??
    getNearestDayColumn(layout.dayColumns, sourceRect.left + 1);

  if (!sourceColumn) {
    return null;
  }

  return createTimedDragVisual({
    dayDate: sourceColumn.date,
    dayIndex: sourceColumn.index,
    endMinutes: getLocalMinutes(target.event.endDate),
    eventId: target.event._id!,
    pointerStart,
    sourceRect,
    startMinutes: getLocalMinutes(target.event.startDate),
  });
};

export const updateTimedDragInteractionVisual = ({
  layout,
  pointer,
  scrollDeltaPx,
  target,
  visual,
}: {
  layout: WeekLayoutCache;
  pointer: VisualPoint;
  scrollDeltaPx: number;
  target: WeekTimedDragTarget;
  visual: TimedDragVisual;
}) => {
  const nextVisual = updateTimedDragVisual(visual, {
    layout,
    pointer,
    scrollDeltaPx,
  });

  return {
    // Null over the all-day row: the ghost is about to lose its times, so there
    // is nothing to preview.
    event:
      nextVisual.row === "allDay"
        ? null
        : timedDragVisualToGridEvent(target.event, nextVisual),
    visual: nextVisual,
  };
};

export const commitTimedDragInteraction = (
  target: WeekTimedDragTarget,
  visual: TimedDragVisual,
): WeekTimedDragCommitResult => {
  // A drop in the all-day row is always a change, even onto the same day: the
  // event loses its time of day.
  const isCrossRow = visual.row === "allDay";
  const movedEvent = isCrossRow
    ? timedDragVisualToAllDayGridEvent(target.event, visual)
    : timedDragVisualToGridEvent(target.event, visual);

  return {
    event: movedEvent,
    eventId: target.event._id!,
    hadFormOpenBeforeInteraction: target.hadFormOpenBeforeInteraction,
    hasMoved: isCrossRow || hasTimedDragVisualMoved(visual),
    type: "timedDragEnd",
  };
};
