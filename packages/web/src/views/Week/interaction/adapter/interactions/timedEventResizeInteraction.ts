import { type CalendarInteractionPoint } from "@web/interaction/CalendarInteractionSession";
import { getLocalMinutes } from "@web/layout/calendar-grid/interaction/calendarInteractionDate";
import {
  createTimedResizeVisual,
  updateTimedResizeVisual,
} from "@web/layout/calendar-grid/interaction/math/timedResize";
import {
  type VisualPoint,
  type VisualRect,
} from "@web/layout/calendar-grid/interaction/model/TimedDragVisual";
import { type TimedResizeVisual } from "@web/layout/calendar-grid/interaction/model/TimedResizeVisual";
import {
  hasTimedResizeVisualMoved,
  timedResizeVisualToGridEvent,
} from "../commit/timedDragVisualToGridEvent";
import { type WeekLayoutCache } from "../geometry/weekLayoutCache";
import {
  type WeekTimedResizeCommitResult,
  type WeekTimedResizeTarget,
} from "../WeekInteractionAdapter.types";

export const createTimedResizeInteractionVisual = ({
  pointerStart,
  sourceRect,
  target,
}: {
  pointerStart: CalendarInteractionPoint;
  sourceRect: VisualRect;
  target: WeekTimedResizeTarget;
}) =>
  createTimedResizeVisual({
    edge: target.edge,
    endMinutes: getLocalMinutes(target.event.endDate),
    eventId: target.event._id!,
    pointerStart,
    sourceRect,
    startMinutes: getLocalMinutes(target.event.startDate),
  });

export const updateTimedResizeInteractionVisual = ({
  layout,
  pointer,
  scrollDeltaPx,
  target,
  visual,
}: {
  layout: WeekLayoutCache;
  pointer: VisualPoint;
  scrollDeltaPx?: number;
  target: WeekTimedResizeTarget;
  visual: TimedResizeVisual;
}) => {
  const nextVisual = updateTimedResizeVisual(visual, {
    layout,
    pointer,
    scrollDeltaPx,
  });

  return {
    event: timedResizeVisualToGridEvent(target.event, nextVisual),
    visual: nextVisual,
  };
};

export const commitTimedResizeInteraction = (
  target: WeekTimedResizeTarget,
  visual: TimedResizeVisual,
): WeekTimedResizeCommitResult => {
  const resizedEvent = timedResizeVisualToGridEvent(target.event, visual);

  return {
    event: resizedEvent,
    eventId: target.event._id!,
    hadFormOpenBeforeInteraction: target.hadFormOpenBeforeInteraction,
    hasMoved: hasTimedResizeVisualMoved(visual),
    type: "timedResizeEnd",
  };
};
