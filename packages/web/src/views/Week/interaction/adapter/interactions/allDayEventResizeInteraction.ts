import { type CalendarInteractionPoint } from "@web/common/calendar-interaction/CalendarInteractionSession";
import {
  allDayResizeVisualToGridEvent,
  hasAllDayResizeVisualChanged,
} from "../commit/allDayVisualToGridEvent";
import { type WeekLayoutCache } from "../geometry/weekLayoutCache";
import {
  createAllDayResizeVisual,
  updateAllDayResizeVisual,
} from "../math/allDayResize";
import { type AllDayResizeVisual } from "../model/AllDayResizeVisual";
import { type VisualPoint, type VisualRect } from "../model/TimedDragVisual";
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
