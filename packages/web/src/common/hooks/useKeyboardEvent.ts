import { DependencyList, useCallback, useEffect, useMemo } from "react";
import { filter, map } from "rxjs/operators";
import {
  KeyCombination,
  globalOnKeyPressHandler,
  globalOnKeyUpHandler,
  keyPressed$,
  keyReleased$,
} from "@web/common/utils/dom/event-emitter.util";
import { isEditable } from "@web/views/Day/util/day.shortcut.util";

interface Options {
  combination: string[];
  handler?: (e: KeyCombination) => void;
  exactMatch?: boolean;
  listenWhileEditing?: boolean;
  deps?: DependencyList;
  eventType: "keydown" | "keyup";
}

/**
 * useKeyboardEvent
 *
 * hook to listen to specific global DOM keyboard events key combination
 * can be called multiple times in different components
 * leverages single root event listener for keydown and keyup events
 */
export function useKeyboardEvent({
  combination,
  exactMatch = true,
  handler,
  listenWhileEditing,
  deps = [],
  eventType = "keyup",
}: Options) {
  const $event = useMemo(
    () =>
      eventType === "keydown"
        ? keyPressed$.pipe(filter((keyCombination) => keyCombination !== null))
        : keyReleased$,
    [eventType],
  );

  const combinationFilter = useCallback(
    ({ sequence }: KeyCombination) => {
      if (!exactMatch) {
        return (
          [...sequence]
            .sort((a, b) => a.localeCompare(b))
            .join("+")
            .toLowerCase() ===
          [...combination]
            .sort((a, b) => a.localeCompare(b))
            .join("+")
            .toLowerCase()
        );
      }

      return (
        sequence.join("+").toLowerCase() === combination.join("+").toLowerCase()
      );
    },
    [combination, exactMatch],
  );

  const listenFilter = useCallback(
    ({ event }: KeyCombination) => {
      const targetElement = event.target as HTMLElement;
      const activeElement = document.activeElement as HTMLElement;
      const activeElementEditable = isEditable(activeElement);
      const eventTargetEditable = isEditable(targetElement);
      const isInsideEditable = activeElementEditable || eventTargetEditable;

      if (listenWhileEditing && isInsideEditable) {
        if (activeElement) {
          activeElement?.blur?.();
        } else if (targetElement) {
          targetElement?.blur?.();
        }
      }

      return listenWhileEditing ? true : !isInsideEditable;
    },
    [listenWhileEditing],
  );

  const preventDefault = useCallback((combination: KeyCombination) => {
    combination.event.preventDefault();

    return combination;
  }, []);

  const resetSequence = useCallback((combination: KeyCombination) => {
    const { event, sequence } = combination;
    const metaKeys = ["Meta", "Control", "Alt", "Shift"];
    const nextSequence = sequence.filter((key) => metaKeys.includes(key));

    if (nextSequence.length === 0) {
      keyPressed$.next(null);
    } else {
      keyPressed$.next({ event, sequence: nextSequence });
    }

    return combination;
  }, []);

  useEffect(() => {
    if (!handler) return;

    const subscription = $event
      .pipe(filter(combinationFilter))
      .pipe(filter(listenFilter))
      .pipe(map(preventDefault))
      .pipe(map(resetSequence))
      .subscribe(handler);

    return () => subscription.unsubscribe();
  }, [
    $event,
    combinationFilter,
    listenFilter,
    preventDefault,
    resetSequence,
    handler,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ...(deps ?? []),
  ]);
}

/**
 * useSetupKeyboardEvents
 *
 * hook to setup global key event listeners
 * should only be ideally called once in the app root component
 */
export function useSetupKeyboardEvents() {
  useEffect(() => {
    window.addEventListener("keydown", globalOnKeyPressHandler);
    window.addEventListener("keyup", globalOnKeyUpHandler);

    return () => {
      window.removeEventListener("keydown", globalOnKeyPressHandler);
      window.removeEventListener("keyup", globalOnKeyUpHandler);
    };
  }, []);
}

export function useKeyUpEvent(options: Omit<Options, "eventType">) {
  return useKeyboardEvent({ ...options, eventType: "keyup" });
}

export function useKeyDownEvent(options: Omit<Options, "eventType">) {
  return useKeyboardEvent({ ...options, eventType: "keydown" });
}
