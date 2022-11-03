import { MouseEvent, useEffect } from "react";

/*
Reference: https://usehooks.com/useOnClickOutside/
*/

export const useOnClickOutside = (ref, handler) => {
  useEffect(
    () => {
      const listener = (event: MouseEvent) => {
        // Do nothing if clicking ref's element or descendent elements
        if (!ref.current || ref.current.contains(event.target)) {
          return;
        }
        handler(event);
      };
      document.addEventListener("mousedown", listener);
      return () => {
        document.removeEventListener("mousedown", listener);
      };
    },
    // Add ref and handler to effect dependencies
    // Because passed in handler, this effect
    // callback/cleanup to run every render.
    // To optimize, wrap handler in useCallback before
    // passing it into this hook.
    [ref, handler]
  );
};
