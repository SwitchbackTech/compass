import { MouseEvent, useRef, useEffect } from "react";

export const useEventListener = (
  eventName: "click" | "mousedown" | "mouseup" | "mousemove",
  handler: (e: MouseEvent) => void,
  element = window
) => {
  const savedHandler = useRef<(e: MouseEvent) => void>();

  useEffect(() => {
    // This allows this effect to always get latest handler
    // without us needing to pass it in effect deps array,
    // causing excessive re-rendering.
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
    // Don't remove 'element' from dep array before adequately
    // testing. Doing so might pass typechecking and some tests,
    // but might cause onmouseup events from useGridClick to break
  }, [element, eventName]);
};
