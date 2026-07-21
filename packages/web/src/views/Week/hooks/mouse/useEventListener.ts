import { useEffect, useRef } from "react";

type MouseEventHandler = {
  bivarianceHack(event: MouseEvent): void;
}["bivarianceHack"];

export const useEventListener = (
  eventName: "mouseup" | "mousemove",
  handler: MouseEventHandler,
  // Accept null so a fail-soft element lookup (getElemById returns null when
  // the element is absent) can pass through — the effect already no-ops when
  // the element can't receive listeners.
  element: HTMLElement | Window | null = window,
) => {
  const savedHandler = useRef<(e: MouseEvent) => void>(handler);
  // Update ref.current value if handler changes.
  // This allows our effect below to always get latest handler ...
  // ... without us needing to pass it in effect deps array ...
  // ... and potentially cause effect to re-run every render.

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    // Inline the guard on `element` (not a separate `isSupported` const) so
    // TypeScript narrows `element` to non-null for the calls below.
    if (!element?.addEventListener) return;

    const listener = (event: Event) => {
      savedHandler.current(event as MouseEvent);
    };

    element.addEventListener(eventName, listener);

    return () => {
      element.removeEventListener(eventName, listener);
    };
    // removing 'element' passes some eventform tests
    // but fails to capture onmouseup events from useGridClick
    // }, [element, eventName]);
  }, [element, eventName]);
};
