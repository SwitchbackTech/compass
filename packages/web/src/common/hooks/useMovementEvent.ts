import {
  DependencyList,
  PointerEvent,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { BehaviorSubject, EMPTY, NEVER, fromEvent, iif, merge, of } from "rxjs";
import { filter, map, switchMap } from "rxjs/operators";
import {
  DomMovement,
  domMovement$,
  globalMovementHandler,
} from "@web/common/utils/dom/event-emitter.util";

interface Options {
  handler?: (e: DomMovement) => void;
  selectors?: Array<keyof HTMLElementTagNameMap | string>; // css selectors
  deps?: DependencyList;
  eventTypes?: Array<"pointerup" | "pointerdown" | "pointermove">;
}

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

  const togglePointerMovementTracking = useCallback(
    (pauseTracking?: boolean) => pause.next(pauseTracking ?? !pause.getValue()),
    [pause],
  );

  useEffect(() => {
    const pointerMovement$ = of(handler).pipe(
      switchMap((handle = () => {}) =>
        iif(
          () => !!handler,
          domMovement$.pipe(
            filter(typeFilter),
            filter(elementsFilter),
            map(handle),
          ),
          EMPTY,
        ),
      ),
    );

    const movement$ = pause.pipe(
      switchMap((paused) => iif(() => paused, NEVER, pointerMovement$)),
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
    const pointerdown = fromEvent<PointerEvent>(window, "pointerdown");
    const pointerup = fromEvent<PointerEvent>(window, "pointerup");
    const pointermove = fromEvent<PointerEvent>(window, "pointermove");
    const pointer = merge(pointerdown, pointerup, pointermove);

    const events = pointer.subscribe(globalMovementHandler);

    return () => events.unsubscribe();
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
