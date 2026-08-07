import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@web/common/hooks/prefersReducedMotion";

/**
 * Shared dismiss state machine: flip `closing` for a CSS exit transition,
 * then call `onComplete` after `durationMs` (or immediately when the user
 * prefers reduced motion). Clears the timer on unmount.
 */
export function useDismissTransition(durationMs: number) {
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const beginDismiss = (onComplete: () => void): boolean => {
    if (closingRef.current) return false;
    closingRef.current = true;
    setClosing(true);
    const delay = prefersReducedMotion() ? 0 : durationMs;
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      // Clear closing before onComplete so stay-mounted surfaces (UpNextBanner)
      // can dismiss a later event, and so both updates batch in one render.
      closingRef.current = false;
      setClosing(false);
      onComplete();
    }, delay);
    return true;
  };

  return { closing, beginDismiss };
}
