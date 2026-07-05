import { type WeekInteractionEdgeNavigationState } from "../state/weekInteractionEdgeNavigationState";

export type WeekEdgeNavigationSide = "next" | "prev";

export interface WeekEdgeNavigationBounds {
  bottom: number;
  edgeThresholdPx?: number;
  left: number;
  right: number;
  top: number;
}

export interface WeekEdgeNavigationPoint {
  x: number;
  y: number;
}

export interface WeekEdgeNavigationUpdate {
  isDwellActive: boolean;
  requestedSide: WeekEdgeNavigationSide | null;
  state: WeekInteractionEdgeNavigationState;
}

export interface WeekEdgeNavigationController {
  reset(): void;
  update(input: {
    bounds: WeekEdgeNavigationBounds;
    pointer: WeekEdgeNavigationPoint;
    timestamp: number;
  }): WeekEdgeNavigationUpdate;
}

export const WEEK_EDGE_NAVIGATION_DWELL_MS = 500;
export const WEEK_EDGE_NAVIGATION_THRESHOLD_PX = 50;

const idleDraggingState: WeekInteractionEdgeNavigationState = {
  currentEdge: null,
  isDragging: true,
  isTimerActive: false,
  progress: 0,
};

export const createWeekEdgeNavigationController =
  (): WeekEdgeNavigationController => {
    let enteredAt: number | null = null;
    let requested = false;
    let side: WeekEdgeNavigationSide | null = null;

    const reset = () => {
      enteredAt = null;
      requested = false;
      side = null;
    };

    const update: WeekEdgeNavigationController["update"] = ({
      bounds,
      pointer,
      timestamp,
    }) => {
      const nextSide = getWeekEdgeNavigationSide(bounds, pointer);

      if (!nextSide) {
        reset();
        return {
          isDwellActive: false,
          requestedSide: null,
          state: idleDraggingState,
        };
      }

      if (side !== nextSide) {
        enteredAt = timestamp;
        requested = false;
        side = nextSide;

        return {
          isDwellActive: true,
          requestedSide: null,
          state: toIndicatorState(nextSide, true, 0),
        };
      }

      const elapsedMs = enteredAt === null ? 0 : timestamp - enteredAt;
      const progress = Math.min(
        (elapsedMs / WEEK_EDGE_NAVIGATION_DWELL_MS) * 100,
        100,
      );

      if (!requested && elapsedMs >= WEEK_EDGE_NAVIGATION_DWELL_MS) {
        requested = true;

        return {
          isDwellActive: false,
          requestedSide: nextSide,
          state: toIndicatorState(nextSide, false, 0),
        };
      }

      return {
        isDwellActive: !requested,
        requestedSide: null,
        state: toIndicatorState(nextSide, !requested, progress),
      };
    };

    return {
      reset,
      update,
    };
  };

const getWeekEdgeNavigationSide = (
  bounds: WeekEdgeNavigationBounds,
  pointer: WeekEdgeNavigationPoint,
): WeekEdgeNavigationSide | null => {
  const edgeThresholdPx =
    bounds.edgeThresholdPx ?? WEEK_EDGE_NAVIGATION_THRESHOLD_PX;
  const isInVerticalBounds =
    pointer.y >= bounds.top && pointer.y <= bounds.bottom;

  if (!isInVerticalBounds) {
    return null;
  }

  if (pointer.x < bounds.left + edgeThresholdPx) {
    return "prev";
  }

  if (pointer.x > bounds.right - edgeThresholdPx) {
    return "next";
  }

  return null;
};

const toIndicatorState = (
  side: WeekEdgeNavigationSide,
  isTimerActive: boolean,
  progress: number,
): WeekInteractionEdgeNavigationState => ({
  currentEdge: side === "prev" ? "left" : "right",
  isDragging: true,
  isTimerActive,
  progress,
});
