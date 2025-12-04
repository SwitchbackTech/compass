import { DependencyList, useCallback, useEffect, useMemo } from "react";
import { BehaviorSubject, EMPTY, NEVER, fromEvent, iif, merge, of } from "rxjs";
import { filter, map, switchMap } from "rxjs/operators";
import {
  DomMovement,
  domMovement,
  globalMovementHandler,
} from "@web/common/utils/dom-events/event-emitter.util";

interface Options {
  handler?: (e: DomMovement) => void;
  selectors?: Array<keyof HTMLElementTagNameMap | string>; // css selectors
  deps?: DependencyList;
  eventTypes?: Array<
    | "mousedown"
    | "mouseup"
    | "mousemove"
    | "touchstart"
    | "touchend"
    | "touchmove"
    | "touchcancel"
  >;
}

/**
 * useMovementEvent
 *
 * Hook to listen to specific global DOM mouse or touch events.
 * Can be called multiple times in different components.
 * Leverages a single root event listener for touch or mouse events.
 * Make sure to memoize the handler function to avoid unnecessary subscriptions.
 *
 * Call `toggleMouseMovementTracking()` to toggle (pause/resume) event tracking,
 * or pass a boolean to explicitly pause (`true`) or resume (`false`) tracking.
 * Example: `const { toggleMouseMovementTracking } = useMovementEvent(...);`
 */
export function useMovementEvent({
  handler,
  deps = [],
  eventTypes = [],
  selectors: selectors = [],
}: Options) {
  const typeFilter = useCallback(
    ({ event }: DomMovement) => {
      if (eventTypes.length === 0) return true;

      return eventTypes.some((eventType) => event.type === eventType);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    eventTypes,
  );

  const elementsFilter = useCallback(
    (combination: DomMovement) => {
      if (selectors.length === 0) return true;

      return selectors.some((el) => combination.element?.closest(el));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    selectors,
  );

  const pause = useMemo(() => new BehaviorSubject<boolean>(false), []);

  const toggleMouseMovementTracking = useCallback(
    (pauseTracking?: boolean) => pause.next(pauseTracking ?? !pause.getValue()),
    [pause],
  );

  useEffect(() => {
    const domMovement$ = of(handler).pipe(
      switchMap((handle = () => {}) =>
        iif(
          () => !!handler,
          domMovement.pipe(
            filter(typeFilter),
            filter(elementsFilter),
            map(handle),
          ),
          EMPTY,
        ),
      ),
    );

    const movement$ = pause.pipe(
      switchMap((paused) => iif(() => paused, NEVER, domMovement$)),
    );

    const subscription = movement$.subscribe();

    return () => subscription.unsubscribe();
  }, [
    elementsFilter,
    handler,
    pause,
    typeFilter,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ...(deps ?? []),
  ]);

  return { toggleMouseMovementTracking };
}

/**
 * useSetupMovementEvents
 *
 * hook to setup global mouse/touch event listeners
 * should only be ideally called once in the app root component
 */
export function useSetupMovementEvents() {
  useEffect(() => {
    const mousedown = fromEvent<MouseEvent>(window, "mousedown");
    const mouseup = fromEvent<MouseEvent>(window, "mouseup");
    const mousemove = fromEvent<MouseEvent>(window, "mousemove");
    const mouse = merge(mousedown, mouseup, mousemove);

    const touchstart = fromEvent<TouchEvent>(window, "touchstart");
    const touchend = fromEvent<TouchEvent>(window, "touchend");
    const touchmove = fromEvent<TouchEvent>(window, "touchmove");
    const touch = merge(touchstart, touchend, touchmove);

    const events = merge(mouse, touch).subscribe(globalMovementHandler);

    return () => events.unsubscribe();
  }, []);
}

export function useMouseUpEvent(options: Omit<Options, "eventTypes">) {
  return useMovementEvent({ ...options, eventTypes: ["mouseup"] });
}

export function useMouseDownEvent(options: Omit<Options, "eventTypes">) {
  return useMovementEvent({ ...options, eventTypes: ["mousedown"] });
}

export function useMouseMoveEvent(options: Omit<Options, "eventTypes">) {
  return useMovementEvent({ ...options, eventTypes: ["mousemove"] });
}

export function useTouchStartEvent(options: Omit<Options, "eventTypes">) {
  return useMovementEvent({ ...options, eventTypes: ["touchstart"] });
}

export function useTouchEndEvent(options: Omit<Options, "eventTypes">) {
  return useMovementEvent({ ...options, eventTypes: ["touchend"] });
}

export function useTouchMoveEvent(options: Omit<Options, "eventTypes">) {
  return useMovementEvent({ ...options, eventTypes: ["touchmove"] });
}
