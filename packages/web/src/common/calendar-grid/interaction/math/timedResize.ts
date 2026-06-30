import { type CalendarLayoutCache } from "@web/common/calendar-grid/interaction/calendarLayoutCache";
import { type VisualPoint, type VisualRect } from "../model/TimedDragVisual";
import {
  type TimedResizeEdge,
  type TimedResizeVisual,
} from "../model/TimedResizeVisual";
import { clamp, snapToStep } from "./snap";

const MINUTES_PER_DAY = 24 * 60;

interface CreateTimedResizeVisualInput {
  edge: TimedResizeEdge;
  endMinutes: number;
  eventId: string;
  pointerStart: VisualPoint;
  sourceRect: VisualRect;
  startMinutes: number;
}

interface UpdateTimedResizeVisualInput {
  layout: CalendarLayoutCache;
  pointer: VisualPoint;
  scrollDeltaPx?: number;
}

export const createTimedResizeVisual = ({
  edge,
  endMinutes,
  eventId,
  pointerStart,
  sourceRect,
  startMinutes,
}: CreateTimedResizeVisualInput): TimedResizeVisual => ({
  edge,
  endMinutes,
  eventId,
  height: sourceRect.height,
  initialEdge: edge,
  initialEndMinutes: endMinutes,
  initialStartMinutes: startMinutes,
  pointerStart,
  sourceRect,
  startMinutes,
  transform: { x: 0, y: 0 },
  type: "timedResize",
});

export const updateTimedResizeVisual = (
  visual: TimedResizeVisual,
  { layout, pointer, scrollDeltaPx = 0 }: UpdateTimedResizeVisualInput,
): TimedResizeVisual => {
  const deltaY = pointer.y - visual.pointerStart.y;
  const deltaMinutes = snapToStep(
    (deltaY + scrollDeltaPx) / layout.pixelsPerMinute,
    layout.snapMinutes,
  );
  const nextTimes = getNextResizeTimes(
    visual,
    deltaMinutes,
    layout.snapMinutes,
  );
  const nextDuration = nextTimes.endMinutes - nextTimes.startMinutes;
  const initialDuration = visual.initialEndMinutes - visual.initialStartMinutes;
  const durationDeltaPx =
    (nextDuration - initialDuration) * layout.pixelsPerMinute;

  return {
    ...visual,
    edge: nextTimes.edge,
    endMinutes: nextTimes.endMinutes,
    height: Math.max(0, visual.sourceRect.height + durationDeltaPx),
    startMinutes: nextTimes.startMinutes,
    transform: {
      x: 0,
      y:
        (nextTimes.startMinutes - visual.initialStartMinutes) *
          layout.pixelsPerMinute -
        scrollDeltaPx,
    },
  };
};

const getNextResizeTimes = (
  visual: TimedResizeVisual,
  deltaMinutes: number,
  snapMinutes: number,
): Pick<TimedResizeVisual, "edge" | "endMinutes" | "startMinutes"> => {
  if (visual.initialEdge === "startDate") {
    return getStartEdgeResizeTimes(visual, deltaMinutes, snapMinutes);
  }

  return getEndEdgeResizeTimes(visual, deltaMinutes, snapMinutes);
};

const getStartEdgeResizeTimes = (
  visual: TimedResizeVisual,
  deltaMinutes: number,
  snapMinutes: number,
) => {
  const candidateStart = visual.initialStartMinutes + deltaMinutes;
  const latestStart = visual.initialEndMinutes - snapMinutes;

  if (candidateStart <= latestStart) {
    return {
      edge: "startDate" as const,
      endMinutes: visual.initialEndMinutes,
      startMinutes: clamp(candidateStart, 0, latestStart),
    };
  }

  const earliestFlippedEnd = visual.initialEndMinutes + snapMinutes;

  if (earliestFlippedEnd > MINUTES_PER_DAY) {
    return {
      edge: "startDate" as const,
      endMinutes: visual.initialEndMinutes,
      startMinutes: latestStart,
    };
  }

  return {
    edge: "endDate" as const,
    endMinutes: clamp(candidateStart, earliestFlippedEnd, MINUTES_PER_DAY),
    startMinutes: visual.initialEndMinutes,
  };
};

const getEndEdgeResizeTimes = (
  visual: TimedResizeVisual,
  deltaMinutes: number,
  snapMinutes: number,
) => {
  const candidateEnd = visual.initialEndMinutes + deltaMinutes;
  const earliestEnd = visual.initialStartMinutes + snapMinutes;

  if (candidateEnd >= earliestEnd) {
    return {
      edge: "endDate" as const,
      endMinutes: clamp(candidateEnd, earliestEnd, MINUTES_PER_DAY),
      startMinutes: visual.initialStartMinutes,
    };
  }

  const latestFlippedStart = visual.initialStartMinutes - snapMinutes;

  if (latestFlippedStart < 0) {
    return {
      edge: "endDate" as const,
      endMinutes: earliestEnd,
      startMinutes: visual.initialStartMinutes,
    };
  }

  return {
    edge: "startDate" as const,
    endMinutes: visual.initialStartMinutes,
    startMinutes: clamp(candidateEnd, 0, latestFlippedStart),
  };
};
