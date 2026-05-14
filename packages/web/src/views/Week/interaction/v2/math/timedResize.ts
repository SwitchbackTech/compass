import { type WeekLayoutCache } from "../geometry/WeekLayoutCache";
import { type VisualPoint, type VisualRect } from "../model/TimedDragVisual";
import {
  type TimedResizeEdge,
  type TimedResizeVisual,
} from "../model/TimedResizeVisual";
import { clamp, snapToStep } from "./snap";

const MINUTES_PER_DAY = 24 * 60;

interface CreateTimedResizeVisualInput {
  dayIndex: number;
  edge: TimedResizeEdge;
  endMinutes: number;
  eventId: string;
  pointerStart: VisualPoint;
  sourceRect: VisualRect;
  startMinutes: number;
}

interface UpdateTimedResizeVisualInput {
  layout: WeekLayoutCache;
  pointer: VisualPoint;
}

export const createTimedResizeVisual = ({
  dayIndex,
  edge,
  endMinutes,
  eventId,
  pointerStart,
  sourceRect,
  startMinutes,
}: CreateTimedResizeVisualInput): TimedResizeVisual => ({
  activeEdge: edge,
  dayIndex,
  durationMinutes: endMinutes - startMinutes,
  endMinutes,
  eventId,
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
  { layout, pointer }: UpdateTimedResizeVisualInput,
): TimedResizeVisual => {
  const deltaY = pointer.y - visual.pointerStart.y;
  const deltaMinutes = snapToStep(
    deltaY / layout.pixelsPerMinute,
    layout.snapMinutes,
  );
  const minimumDuration = layout.snapMinutes;
  const nextRange =
    visual.activeEdge === "startDate"
      ? resizeFromStart(visual, deltaMinutes, minimumDuration)
      : resizeFromEnd(visual, deltaMinutes, minimumDuration);

  return {
    ...visual,
    activeEdge: nextRange.activeEdge,
    durationMinutes: nextRange.endMinutes - nextRange.startMinutes,
    endMinutes: nextRange.endMinutes,
    startMinutes: nextRange.startMinutes,
    transform: {
      x: 0,
      y:
        (nextRange.startMinutes - visual.initialStartMinutes) *
        layout.pixelsPerMinute,
    },
  };
};

const resizeFromStart = (
  visual: TimedResizeVisual,
  deltaMinutes: number,
  minimumDuration: number,
) => {
  const proposedStart = visual.initialStartMinutes + deltaMinutes;

  if (proposedStart < visual.initialEndMinutes) {
    return {
      activeEdge: "startDate" as const,
      endMinutes: visual.initialEndMinutes,
      startMinutes: clamp(
        proposedStart,
        0,
        visual.initialEndMinutes - minimumDuration,
      ),
    };
  }

  return {
    activeEdge: "endDate" as const,
    endMinutes: clamp(
      proposedStart,
      visual.initialEndMinutes + minimumDuration,
      MINUTES_PER_DAY,
    ),
    startMinutes: visual.initialEndMinutes,
  };
};

const resizeFromEnd = (
  visual: TimedResizeVisual,
  deltaMinutes: number,
  minimumDuration: number,
) => {
  const proposedEnd = visual.initialEndMinutes + deltaMinutes;

  if (proposedEnd > visual.initialStartMinutes) {
    return {
      activeEdge: "endDate" as const,
      endMinutes: clamp(
        proposedEnd,
        visual.initialStartMinutes + minimumDuration,
        MINUTES_PER_DAY,
      ),
      startMinutes: visual.initialStartMinutes,
    };
  }

  return {
    activeEdge: "startDate" as const,
    endMinutes: visual.initialStartMinutes,
    startMinutes: clamp(
      proposedEnd,
      0,
      visual.initialStartMinutes - minimumDuration,
    ),
  };
};
