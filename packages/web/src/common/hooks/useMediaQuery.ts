import { useLayoutEffect, useState } from "react";

/**
 * Subscribes to a CSS media query and returns whether it currently matches.
 * Updates on `change` so breakpoint / preference flips re-render consumers.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => window.matchMedia?.(query).matches ?? false,
  );

  useLayoutEffect(() => {
    const mediaQuery = window.matchMedia?.(query);
    if (!mediaQuery) return;

    const onChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };
    setMatches(mediaQuery.matches);
    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
