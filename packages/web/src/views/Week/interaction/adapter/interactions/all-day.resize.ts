import {
  createAllDayResizeVisual,
  updateAllDayResizeVisual,
} from "@web/grid/interaction/math/all-day.resize";
import { type AllDayResizeVisual } from "@web/grid/interaction/types/all-day-resize.types";
import {
  type VisualPoint,
  type VisualRect,
} from "@web/grid/interaction/types/timed-drag.types";
import { type InteractionPoint } from "@web/interaction/interaction.types";
import {
  allDayResizeVisualToGridEvent,
  hasAllDayResizeVisualChanged,
} from "../commit/all-day.commit";
import { type WeekLayoutCache } from "../geometry/week-layout.cache";
import {
  type WeekAllDayResizeCommitResult,
  type WeekAllDayResizeTarget,
} from "../week-interaction.adapter.types";
import { getVisibleAllDayRange } from "./all-day.visible-range";

export const createAllDayResizeInteractionVisual = ({
  layout,
  pointerStart,
  sourceRect,
  target,
}: {
  layout: WeekLayoutCache;
  pointerStart: InteractionPoint;
  sourceRect: VisualRect;
  target: WeekAllDayResizeTarget;
}) => {
  const visibleRange = getVisibleAllDayRange(layout, sourceRect);

  return createAllDayResizeVisual({
    edge: target.edge,
    endDayIndex: visibleRange.endDayIndex,
    eventId: target.event._id!,
    pointerStart,
    sourceRect,
    startDayIndex: visibleRange.startDayIndex,
  });
};

export const updateAllDayResizeInteractionVisual = ({
  layout,
  pointer,
  visual,
}: {
  layout: WeekLayoutCache;
  pointer: VisualPoint;
  visual: AllDayResizeVisual;
}) =>
  updateAllDayResizeVisual(visual, {
    layout,
    pointer,
  });

export const commitAllDayResizeInteraction = (
  target: WeekAllDayResizeTarget,
  visual: AllDayResizeVisual,
): WeekAllDayResizeCommitResult => {
  const resizedEvent = allDayResizeVisualToGridEvent(target.event, visual);

  return {
    event: resizedEvent,
    eventId: target.event._id!,
    hadFormOpenBeforeInteraction: target.hadFormOpenBeforeInteraction,
    hasMoved: hasAllDayResizeVisualChanged(visual),
    type: "allDayResizeEnd",
  };
};
