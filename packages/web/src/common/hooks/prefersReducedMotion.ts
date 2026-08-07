import { useMediaQuery } from "@web/common/hooks/useMediaQuery";

export const PREFERS_REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** One-shot read for event handlers and layout effects. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia?.(PREFERS_REDUCED_MOTION_QUERY).matches ?? false;
}

/** Reactive subscription for render-time consumers. */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery(PREFERS_REDUCED_MOTION_QUERY);
}
