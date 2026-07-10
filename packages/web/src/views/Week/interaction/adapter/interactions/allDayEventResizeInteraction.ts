import { type CalendarInteractionPoint } from "@web/interaction/CalendarInteractionSession";
import {
  createAllDayResizeVisual,
  updateAllDayResizeVisual,
} from "@web/layout/calendar-grid/interaction/math/allDayResize";
import { type AllDayResizeVisual } from "@web/layout/calendar-grid/interaction/model/AllDayResizeVisual";
import {
  type VisualPoint,
  type VisualRect,
} from "@web/layout/calendar-grid/interaction/model/TimedDragVisual";
import {
  allDayResizeVisualToGridEvent,
  hasAllDayResizeVisualChanged,
} from "../commit/allDayVisualToGridEvent";
import { type WeekLayoutCache } from "../geometry/weekLayoutCache";
import {
  type WeekAllDayResizeCommitResult,
  type WeekAllDayResizeTarget,
} from "../WeekInteractionAdapter.types";
import { getVisibleAllDayRange } from "./allDayVisibleRange";

export const createAllDayResizeInteractionVisual = ({
  layout,
  pointerStart,
  sourceRect,
  target,
}: {
  layout: WeekLayoutCache;
  pointerStart: CalendarInteractionPoint;
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
