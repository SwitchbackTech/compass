import { useEffect } from "react";
import { isHigherEscapeOwner } from "@web/shortcuts/escape-ownership";
import {
  keyboardOnlyActions,
  useKeyboardOnlyStore,
} from "@web/shortcuts/keyboard-only/keyboard-only.store";
import {
  resetSharedShiftTapGesture,
  subscribeToShiftTapGesture,
} from "@web/shortcuts/shift-tap-gesture";

/**
 * SHIFT-SHIFT (two quick taps) toggles keyboard-only mode. Clicks are inert;
 * ESC, SHIFT-SHIFT again, or refresh exits. Mode is not persisted.
 *
 * ESC stands down while app lock, floating layers, or the event form own Escape
 * so those dismiss first; a later ESC exits this mode.
 */
export function useKeyboardOnlyMode() {
  const isActive = useKeyboardOnlyStore((state) => state.isActive);

  useEffect(() => {
    return subscribeToShiftTapGesture((event) => {
      if (event.type !== "doubleTap") return;
      if (useKeyboardOnlyStore.getState().isActive) {
        keyboardOnlyActions.exit();
      } else {
        keyboardOnlyActions.enter();
      }
    });
  }, []);

  // Click suppression while active. Window capture runs before React's
  // delegated root listeners (and grid PointerCaptureBoundary), so clicks
  // never reach event open handlers. Scroll and hover stay live.
  useEffect(() => {
    if (!isActive) return;

    const blockPointer = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      // Pulse once per gesture (pointerdown), not again on click/mousedown.
      if (event.type === "pointerdown") {
        keyboardOnlyActions.pulseBlockedClick();
      }
    };

    window.addEventListener("pointerdown", blockPointer, true);
    window.addEventListener("mousedown", blockPointer, true);
    window.addEventListener("click", blockPointer, true);
    window.addEventListener("auxclick", blockPointer, true);

    return () => {
      window.removeEventListener("pointerdown", blockPointer, true);
      window.removeEventListener("mousedown", blockPointer, true);
      window.removeEventListener("click", blockPointer, true);
      window.removeEventListener("auxclick", blockPointer, true);
    };
  }, [isActive]);

  // ESC exits when nothing higher owns Escape.
  useEffect(() => {
    if (!isActive) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (event.defaultPrevented) return;
      if (isHigherEscapeOwner()) return;

      event.preventDefault();
      event.stopPropagation();
      keyboardOnlyActions.exit();
      resetSharedShiftTapGesture();
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [isActive]);
}
