import {
  createAllDayDragVisual,
  updateAllDayDragVisual,
} from "@web/common/calendar-grid/interaction/math/allDayDrag";
import { type AllDayDragVisual } from "@web/common/calendar-grid/interaction/model/AllDayDragVisual";
import {
  type VisualPoint,
  type VisualRect,
} from "@web/common/calendar-grid/interaction/model/TimedDragVisual";
import { type CalendarInteractionPoint } from "@web/common/calendar-interaction/CalendarInteractionSession";
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

  return createAllDayDragVisual({
    dayIndex: visibleRange.startDayIndex,
    eventId: target.event._id!,
    pointerStart,
    sourceRect,
  });
};

export const updateAllDayDragInteractionVisual = ({
  layout,
  pointer,
  visual,
}: {
  layout: WeekLayoutCache;
  pointer: VisualPoint;
  visual: AllDayDragVisual;
}) =>
  updateAllDayDragVisual(visual, {
    layout,
    pointer,
  });

export const commitAllDayDragInteraction = (
  target: WeekAllDayDragTarget,
  visual: AllDayDragVisual,
): WeekAllDayDragCommitResult => {
  const movedEvent = allDayDragVisualToGridEvent(target.event, visual);

  return {
    event: movedEvent,
    eventId: target.event._id!,
    hadFormOpenBeforeInteraction: target.hadFormOpenBeforeInteraction,
    hasMoved: hasAllDayDragVisualMoved(visual),
    type: "allDayDragEnd",
  };
};
