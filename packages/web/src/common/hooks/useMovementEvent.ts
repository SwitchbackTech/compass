import {
  type DependencyList,
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  type DomMovement,
  globalMovementHandler,
  subscribeDomMovement,
} from "@web/common/utils/dom/event-emitter.util";

interface Options {
  handler?: (e: DomMovement) => void;
  selectors?: Array<keyof HTMLElementTagNameMap | string>; // css selectors
  deps?: DependencyList;
  eventTypes?: Array<"pointerup" | "pointerdown" | "pointermove">;
}

const DEFAULT_EVENT_TYPES: Array<"pointerup" | "pointerdown" | "pointermove"> =
  [];
const DEFAULT_SELECTORS: Array<keyof HTMLElementTagNameMap | string> = [];

/**
 * useMovementEvent
 *
 * Hook to listen to specific global DOM mouse or touch events.
 * Can be called multiple times in different components.
 * Leverages a single root event listener for touch or mouse events.
 * Make sure to memoize the handler function to avoid unnecessary subscriptions.
 *
 * Call `togglePointerMovementTracking()` to toggle (pause/resume) event tracking,
 * or pass a boolean to explicitly pause (`true`) or resume (`false`) tracking.
 * Example: `const { togglePointerMovementTracking } = useMovementEvent(...);`
 */
export function useMovementEvent({
  handler,
  deps = [],
  eventTypes = DEFAULT_EVENT_TYPES,
  selectors = DEFAULT_SELECTORS,
}: Options) {
  const typeFilter = useCallback(
    ({ event }: DomMovement) => {
      if (eventTypes.length === 0) return true;

      return eventTypes.some((eventType) => event.type === eventType);
    },
    [eventTypes],
  );

  const elementsFilter = useCallback(
    (combination: DomMovement) => {
      if (selectors.length === 0) return true;

      return selectors.some((el) => combination.element?.closest(el));
    },
    [selectors],
  );

  // Pause state is read inside the live subscription, so a ref lets us toggle
  // tracking without tearing down and re-creating the listener.
  const pausedRef = useRef(false);

  const togglePointerMovementTracking = useCallback(
    (pauseTracking?: boolean) => {
      pausedRef.current = pauseTracking ?? !pausedRef.current;
    },
    [],
  );

  useEffect(() => {
    if (!handler) return;

    return subscribeDomMovement((movement) => {
      if (pausedRef.current) return;
      if (!typeFilter(movement)) return;
      if (!elementsFilter(movement)) return;

      handler(movement);
    });
  }, [
    elementsFilter,
    handler,
    typeFilter,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ...(deps ?? []),
  ]);

  return { togglePointerMovementTracking };
}

/**
 * useSetupMovementEvents
 *
 * hook to setup global mouse/touch event listeners
 * should only be ideally called once in the app root component
 */
export function useSetupMovementEvents() {
  useEffect(() => {
    const onPointer = (event: globalThis.PointerEvent) =>
      globalMovementHandler(event as unknown as PointerEvent);

    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("pointerup", onPointer);
    window.addEventListener("pointermove", onPointer);

    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("pointerup", onPointer);
      window.removeEventListener("pointermove", onPointer);
    };
  }, []);
}

export function usePointerUpEvent(options: Omit<Options, "eventTypes">) {
  return useMovementEvent({ ...options, eventTypes: ["pointerup"] });
}

export function usePointerDownEvent(options: Omit<Options, "eventTypes">) {
  return useMovementEvent({ ...options, eventTypes: ["pointerdown"] });
}

export function usePointerMoveEvent(options: Omit<Options, "eventTypes">) {
  return useMovementEvent({ ...options, eventTypes: ["pointermove"] });
}
