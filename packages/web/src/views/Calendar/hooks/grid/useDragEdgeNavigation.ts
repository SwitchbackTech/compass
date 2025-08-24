import { MutableRefObject, useEffect, useRef, useState } from "react";
import { useDraftContext } from "@web/views/Calendar/components/Draft/context/useDraftContext";
import { WeekProps } from "../useWeek";

const EDGE_THRESHOLD = 50; // pixels from edge to trigger navigation
const NAVIGATION_DELAY = 500; // milliseconds to hold before navigating

export const useDragEdgeNavigation = (
  mainGridRef: MutableRefObject<HTMLDivElement | null>,
  weekProps: WeekProps,
) => {
  const { state } = useDraftContext();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastEdgeRef = useRef<"left" | "right" | null>(null);

  // Track mouse position during dragging
  useEffect(() => {
    if (!state.isDragging) {
      // Clear any pending navigation when dragging stops
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
        navigationTimeoutRef.current = null;
      }
      lastEdgeRef.current = null;

      return;
    }

    // Only handle timed events (not all-day events)
    if (state.draft?.isAllDay !== false) return;

    const updateMousePosition = (event: MouseEvent) => {
      setMousePosition({ x: event.clientX, y: event.clientY });
    };

    window.addEventListener("mousemove", updateMousePosition);

    return () => {
      window.removeEventListener("mousemove", updateMousePosition);
    };
  }, [state.isDragging, state.draft?.isAllDay]);

  // Check for edge proximity and trigger navigation
  useEffect(() => {
    if (
      !mainGridRef.current ||
      !state.isDragging ||
      state.draft?.isAllDay !== false
    ) {
      return;
    }

    const container = mainGridRef.current;
    const { left, right } = container.getBoundingClientRect();
    const { x } = mousePosition;

    let currentEdge: "left" | "right" | null = null;

    // Determine which edge we're near
    if (x < left + EDGE_THRESHOLD) {
      currentEdge = "left";
    } else if (x > right - EDGE_THRESHOLD) {
      currentEdge = "right";
    }

    // If we moved away from an edge, clear the timeout
    if (currentEdge !== lastEdgeRef.current) {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
        navigationTimeoutRef.current = null;
      }
      lastEdgeRef.current = currentEdge;
    }

    // Start navigation timer if we're at an edge and don't already have a timer
    if (currentEdge && !navigationTimeoutRef.current) {
      navigationTimeoutRef.current = setTimeout(() => {
        if (currentEdge === "left") {
          weekProps.util.decrementWeek("drag-to-edge");
        } else if (currentEdge === "right") {
          weekProps.util.incrementWeek("drag-to-edge");
        }
        navigationTimeoutRef.current = null;
      }, NAVIGATION_DELAY);
    }

    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
        navigationTimeoutRef.current = null;
      }
    };
  }, [
    state.isDragging,
    mousePosition.x,
    weekProps.util,
    state.draft?.isAllDay,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);
};
