import { getLocalMinutes } from "@web/common/calendar-grid/interaction/calendarInteractionDate";
import {
  createTimedDragVisual,
  updateTimedDragVisual,
} from "@web/common/calendar-grid/interaction/math/timedDrag";
import {
  type TimedDragVisual,
  type VisualPoint,
  type VisualRect,
} from "@web/common/calendar-grid/interaction/model/TimedDragVisual";
import { type CalendarInteractionPoint } from "@web/common/calendar-interaction/CalendarInteractionSession";
import {
  hasTimedDragVisualMoved,
  timedDragVisualToGridEvent,
} from "../commit/timedDragVisualToGridEvent";
import { type WeekLayoutCache } from "../geometry/weekLayoutCache";
import {
  type WeekTimedDragCommitResult,
  type WeekTimedDragTarget,
} from "../WeekInteractionAdapter.types";

export const createTimedDragInteractionVisual = ({
  pointerStart,
  sourceRect,
  target,
}: {
  pointerStart: CalendarInteractionPoint;
  sourceRect: VisualRect;
  target: WeekTimedDragTarget;
}) =>
  createTimedDragVisual({
    dayIndex: getLocalDayIndex(target.event.startDate),
    endMinutes: getLocalMinutes(target.event.endDate),
    eventId: target.event._id!,
    pointerStart,
    sourceRect,
    startMinutes: getLocalMinutes(target.event.startDate),
  });

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

const getLocalDayIndex = (dateString: string | undefined) => {
  if (!dateString) {
    return new Date(0).getDay();
  }

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);

  if (dateOnly) {
    return new Date(
      Number(dateOnly[1]!),
      Number(dateOnly[2]!) - 1,
      Number(dateOnly[3]!),
    ).getDay();
  }

  return new Date(dateString).getDay();
};
