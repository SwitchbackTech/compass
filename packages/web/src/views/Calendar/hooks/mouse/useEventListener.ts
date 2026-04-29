import { useEffect, useRef } from "react";

type MouseEventHandler = {
  bivarianceHack(event: MouseEvent): void;
}["bivarianceHack"];

export const useEventListener = (
  eventName: "mouseup" | "mousemove",
  handler: MouseEventHandler,
  element: HTMLElement | Window = window,
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
    const isSupported = element?.addEventListener;

    if (!isSupported) return;

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
