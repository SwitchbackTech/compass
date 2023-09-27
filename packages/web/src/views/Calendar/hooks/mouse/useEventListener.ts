import { MouseEvent, useRef, useEffect } from "react";

export const useEventListener = (
  eventName: "mouseup" | "mousemove",
  handler: (e: MouseEvent) => void,
  element = window
) => {
  const savedHandler = useRef<(e: MouseEvent) => void>();
  // Update ref.current value if handler changes.
  // This allows our effect below to always get latest handler ...
  // ... without us needing to pass it in effect deps array ...
  // ... and potentially cause effect to re-run every render.

  useEffect(() => {
    savedHandler.current = handler;
  }, [eventName, handler]);

  useEffect(() => {
    const isSupported = element && element.addEventListener;

    if (!isSupported) return;

    const listener = (event: MouseEvent) => savedHandler.current(event);

    if (element === null) {
      console.log("element is null");
      return;
    }
    element.addEventListener(eventName, listener);

    return () => {
      element.removeEventListener(eventName, listener);
    };
    // removing 'element' passes some eventform tests
    // but fails to capture onmouseup events from useGridClick
    // }, [element, eventName]);
  }, [element, eventName]);
};
