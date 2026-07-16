import { type CalendarInteractionPoint } from "@web/interaction/CalendarInteractionSession";
import { allDayDragVisualToTimedGridEvent } from "@web/layout/calendar-grid/interaction/commit/crossRowVisualToGridEvent";
import {
  createAllDayDragVisual,
  updateAllDayDragVisual,
} from "@web/layout/calendar-grid/interaction/math/allDayDrag";
import { type AllDayDragVisual } from "@web/layout/calendar-grid/interaction/model/AllDayDragVisual";
import {
  type VisualPoint,
  type VisualRect,
} from "@web/layout/calendar-grid/interaction/model/TimedDragVisual";
import {
  allDayDragVisualToGridEvent,
  hasAllDayDragVisualMoved,
} from "../commit/allDayVisualToGridEvent";
import { type WeekLayoutCache } from "../geometry/weekLayoutCache";
import {
  type WeekAllDayDragCommitResult,
  type WeekAllDayDragTarget,
} from "../WeekInteractionAdapter.types";
import { getVisibleAllDayRange } from "./allDayVisibleRange";

export const createAllDayDragInteractionVisual = ({
  layout,
  pointerStart,
  sourceRect,
  target,
}: {
  layout: WeekLayoutCache;
  pointerStart: CalendarInteractionPoint;
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
