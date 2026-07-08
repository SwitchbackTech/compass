import { useCallback, useRef, useState } from "react";
import { isWeekInteractionMotionActive } from "@web/views/Week/interaction/state/weekInteractionMotionState";
import {
  computeVisibleDayCount,
  WEEK_DAY_COUNT,
} from "@web/views/Week/util/week-window.util";

/**
 * Derives how many day columns the week grid can fit from the measured width
 * of the grid track. Defaults to the full week until a real measurement
 * arrives (the ref callback measures during commit, so the browser never
 * paints the unmeasured fallback). Updates freeze during drag interactions so
 * the window never re-derives mid-gesture.
 */
export const useVisibleDayCount = () => {
  const [visibleDayCount, setVisibleDayCount] = useState(WEEK_DAY_COUNT);
  const observerRef = useRef<ResizeObserver | null>(null);

  const trackRef = useCallback((node: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;

    if (!node) {
      return;
    }

    const measure = () => {
      if (isWeekInteractionMotionActive()) {
        return;
      }

      const width = node.getBoundingClientRect().width;
      if (!width) {
        // Unmeasurable (e.g. jsdom): keep showing the full week
        return;
      }

      setVisibleDayCount(computeVisibleDayCount(width));
    };

    measure();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(measure);
    observer.observe(node);
    observerRef.current = observer;
  }, []);

  return { trackRef, visibleDayCount };
};
