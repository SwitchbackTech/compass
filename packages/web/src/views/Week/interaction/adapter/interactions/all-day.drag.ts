import { allDayDragVisualToTimedGridEvent } from "@web/grid/interaction/commit/cross-row.commit";
import {
  createAllDayDragVisual,
  updateAllDayDragVisual,
} from "@web/grid/interaction/math/all-day.drag";
import { type AllDayDragVisual } from "@web/grid/interaction/types/all-day-drag.types";
import {
  type VisualPoint,
  type VisualRect,
} from "@web/grid/interaction/types/timed-drag.types";
import { type InteractionPoint } from "@web/interaction/interaction.types";
import {
  allDayDragVisualToGridEvent,
  hasAllDayDragVisualMoved,
} from "../commit/all-day.commit";
import { type WeekLayoutCache } from "../geometry/week-layout.cache";
import {
  type WeekAllDayDragCommitResult,
  type WeekAllDayDragTarget,
} from "../week-interaction.adapter.types";
import { getVisibleAllDayRange } from "./all-day.visible-range";

export const createAllDayDragInteractionVisual = ({
  layout,
  pointerStart,
  sourceRect,
  target,
}: {
  layout: WeekLayoutCache;
  pointerStart: InteractionPoint;
  sourceRect: VisualRect;
  target: WeekAllDayDragTarget;
}) => {
  const visibleRange = getVisibleAllDayRange(layout, sourceRect);
  const sourceColumn = layout.dayColumns[visibleRange.startDayIndex];

  if (!sourceColumn) {
    return null;
  }

  return createAllDayDragVisual({
    dayDate: sourceColumn.date,
    dayIndex: sourceColumn.index,
    eventId: target.event._id!,
    pointerStart,
    sourceRect,
  });
};

export const updateAllDayDragInteractionVisual = ({
  layout,
  pointer,
  target,
  visual,
}: {
  layout: WeekLayoutCache;
  pointer: VisualPoint;
  target: WeekAllDayDragTarget;
  visual: AllDayDragVisual;
}) => {
  const nextVisual = updateAllDayDragVisual(visual, {
    layout,
    pointer,
  });

  return {
    // Only the timed row has times worth previewing on the ghost; an all-day
    // ghost stays label-less, as it was before cross-row drops existed.
    event:
      nextVisual.row === "timed"
        ? allDayDragVisualToTimedGridEvent(target.event, nextVisual)
        : null,
    visual: nextVisual,
  };
};

export const commitAllDayDragInteraction = (
  target: WeekAllDayDragTarget,
  visual: AllDayDragVisual,
): WeekAllDayDragCommitResult => {
  // A drop in the timed grid is always a change, even onto the same day: the
  // event gains a time of day it never had.
  const isCrossRow = visual.row === "timed";
  const movedEvent = isCrossRow
    ? allDayDragVisualToTimedGridEvent(target.event, visual)
    : allDayDragVisualToGridEvent(target.event, visual);

  return {
    event: movedEvent,
    eventId: target.event._id!,
    hadFormOpenBeforeInteraction: target.hadFormOpenBeforeInteraction,
    hasMoved: isCrossRow || hasAllDayDragVisualMoved(visual),
    type: "allDayDragEnd",
  };
};
