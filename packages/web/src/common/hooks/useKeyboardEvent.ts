import { DependencyList, useCallback, useEffect, useMemo } from "react";
import { filter } from "rxjs/operators";
import {
  KeyCombination,
  globalOnKeyPressHandler,
  globalOnKeyUpHandler,
  keyPressed,
  keyReleased,
} from "@web/common/utils/dom-events/event-emitter.util";
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
        ? keyPressed.pipe(filter((keyCombination) => keyCombination !== null))
        : keyReleased,
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
    ({ event }: KeyCombination) =>
      listenWhileEditing ? true : !isEditable(event.target),
    [listenWhileEditing],
  );

  useEffect(() => {
    if (!handler) return;

    const subscription = $event
      .pipe(filter(combinationFilter))
      .pipe(filter(listenFilter))
      .subscribe(handler);

    return () => subscription.unsubscribe();
  }, [
    $event,
    combinationFilter,
    listenFilter,
    handler,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ...(deps ?? []),
  ]);
}

export function useSetupKeyEvents() {
  useEffect(() => {
    window.addEventListener("keydown", globalOnKeyPressHandler, {
      passive: true,
    });

    window.addEventListener("keyup", globalOnKeyUpHandler, { passive: true });

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
