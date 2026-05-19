import { type CalendarInteractionPoint } from "@web/common/calendar-interaction/CalendarInteractionSession";
import {
  hasTimedDragVisualMoved,
  timedDragVisualToGridEvent,
} from "../commit/timedDragVisualToGridEvent";
import { type WeekLayoutCache } from "../geometry/weekLayoutCache";
import {
  createTimedDragVisual,
  updateTimedDragVisual,
} from "../math/timedDrag";
import {
  type TimedDragVisual,
  type VisualPoint,
  type VisualRect,
} from "../model/TimedDragVisual";
import {
  type WeekTimedDragCommitResult,
  type WeekTimedDragTarget,
} from "../WeekInteractionAdapter.types";
import { getLocalDayIndex, getLocalMinutes } from "./weekInteractionDate";

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
