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
        console.log(event);
        handler(event);
      };
      document.addEventListener("mousedown", listener);
      return () => {
        document.removeEventListener("mousedown", listener);
      };
    },
    // Add ref and handler to effect dependencies
    // It's worth noting that because passed in handler is a new
    // function on every render that will cause this effect
    // callback/cleanup to run every render. It's not a big deal
    // but to optimize you can wrap handler in useCallback before
    // passing it into this hook.
    [ref, handler]
  );
};
