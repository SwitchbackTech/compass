import { useEffect, useRef, useState } from "react";

const DEFAULT_BUFFER_MS = 50;

/**
 * Buffers visibility state changes to prevent UI flashing during rapid state transitions.
 *
 * Shows immediately when `shouldBeVisible` becomes true, but delays hiding by `bufferMs`
 * to prevent flash when visibility is momentarily toggled off then back on (e.g., during
 * async state transitions between different state management systems).
 *
 * @param shouldBeVisible - The computed visibility state that may flash
 * @param bufferMs - Delay in ms before hiding (default: 50ms)
 * @returns Buffered visibility state that won't flash during rapid transitions
 */
export const useBufferedVisibility = (
  shouldBeVisible: boolean,
  bufferMs: number = DEFAULT_BUFFER_MS,
): boolean => {
  const [isVisible, setIsVisible] = useState(shouldBeVisible);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (shouldBeVisible) {
      // Immediately show and cancel any pending hide
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
      setIsVisible(true);
    } else if (isVisible) {
      // Buffer hide to prevent flash during async transitions
      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
        hideTimeoutRef.current = null;
      }, bufferMs);
    }

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [shouldBeVisible, isVisible, bufferMs]);

  return isVisible;
};
