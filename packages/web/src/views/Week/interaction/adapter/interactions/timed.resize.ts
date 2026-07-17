import { getLocalMinutes } from "@web/grid/interaction/date";
import {
  createTimedResizeVisual,
  updateTimedResizeVisual,
} from "@web/grid/interaction/math/timed.resize";
import {
  type VisualPoint,
  type VisualRect,
} from "@web/grid/interaction/types/timed-drag.types";
import { type TimedResizeVisual } from "@web/grid/interaction/types/timed-resize.types";
import { type InteractionPoint } from "@web/interaction/interaction.types";
import {
  hasTimedResizeVisualMoved,
  timedResizeVisualToGridEvent,
} from "../commit/timed.commit";
import { type WeekLayoutCache } from "../geometry/week-layout.cache";
import {
  type WeekTimedResizeCommitResult,
  type WeekTimedResizeTarget,
} from "../week-interaction.adapter.types";

export const createTimedResizeInteractionVisual = ({
  pointerStart,
  sourceRect,
  target,
}: {
  pointerStart: InteractionPoint;
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
