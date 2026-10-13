import { useEffect, useState } from "react";

/**
 * The latest `value`, held back until it has stopped changing for `delayMs`.
 * Used to keep a query key still while the user is still typing, so a
 * suggestion or search request leaves the browser once per pause instead of
 * once per keystroke.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
