import { useRef, useEffect } from "react";

export const useEventListener = (eventName, handler, element = window) => {
  // Create a ref that stores handler
  const savedHandler = useRef();
  // Update ref.current value if handler changes.
  // This allows our effect below to always get latest handler ...
  // ... without us needing to pass it in effect deps array ...
  // ... and potentially cause effect to re-run every render.
  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);
  useEffect(
    () => {
      const isSupported = element && element.addEventListener;

      if (!isSupported) return;

      const eventListener = (event) => savedHandler.current(event);

      element.addEventListener(eventName, eventListener);

      return () => {
        element.removeEventListener(eventName, eventListener);
      };
    },
    [eventName, element] // Re-run if eventName or element changes
  );
};
