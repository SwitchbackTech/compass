import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import dayjs from "@core/util/date/dayjs";
import { type CalendarInteractionPoint } from "@web/interaction/CalendarInteractionSession";
import { getLocalMinutes } from "@web/layout/calendar-grid/interaction/calendarInteractionDate";
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
    event: timedDragVisualToGridEvent(target.event, nextVisual),
    visual: nextVisual,
  };
};

export const commitTimedDragInteraction = (
  target: WeekTimedDragTarget,
  visual: TimedDragVisual,
): WeekTimedDragCommitResult => {
  const movedEvent = timedDragVisualToGridEvent(target.event, visual);

  return {
    event: movedEvent,
    eventId: target.event._id!,
    hadFormOpenBeforeInteraction: target.hadFormOpenBeforeInteraction,
    hasMoved: hasTimedDragVisualMoved(visual),
    type: "timedDragEnd",
  };
};
