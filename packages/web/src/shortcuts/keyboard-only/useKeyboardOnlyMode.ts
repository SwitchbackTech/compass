import { useEffect, useRef } from "react";
import { isEditableKeyboardTarget } from "@web/common/utils/form/form.util";
import { isAppLocked } from "@web/shortcuts/app-lock";
import { isHigherEscapeOwner } from "@web/shortcuts/escape-ownership";
import {
  keyboardOnlyActions,
  useKeyboardOnlyStore,
} from "@web/shortcuts/keyboard-only/keyboard-only.store";
import {
  createKeyboardOnlyDetectorState,
  type KeyboardOnlyDetectorState,
  reduceKeyboardOnlyDetector,
} from "@web/shortcuts/keyboard-only/keyboard-only-detector";
import { isShiftKey } from "@web/shortcuts/shift-hint/shift-hold-detector";

/**
 * SHIFT-SHIFT (two quick taps) toggles keyboard-only mode. Clicks are inert;
 * ESC, SHIFT-SHIFT again, or refresh exits. Mode is not persisted.
 *
 * ESC stands down while app lock, floating layers, or the event form own Escape
 * so those dismiss first; a later ESC exits this mode.
 */
export function useKeyboardOnlyMode() {
  const isActive = useKeyboardOnlyStore((state) => state.isActive);
  const stateRef = useRef<KeyboardOnlyDetectorState>(
    createKeyboardOnlyDetectorState(),
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;

      if (isShiftKey(event)) {
        if (event.repeat) return;
        const blocked = isAppLocked() || isEditableKeyboardTarget(event);
        const result = reduceKeyboardOnlyDetector(stateRef.current, {
          type: "shiftDown",
          now: Date.now(),
          blocked,
        });
        stateRef.current = result.state;
        return;
      }

      if (stateRef.current.phase === "down") {
        const result = reduceKeyboardOnlyDetector(stateRef.current, {
          type: "chordKeyDown",
        });
        stateRef.current = result.state;
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (!isShiftKey(event)) return;
      // Keep counting a hold if the other Shift key is still down.
      if (event.shiftKey) return;

      const { state, entered: doubleTapped } = reduceKeyboardOnlyDetector(
        stateRef.current,
        {
          type: "shiftUp",
          now: Date.now(),
        },
      );
      stateRef.current = state;
      if (!doubleTapped) return;
      if (useKeyboardOnlyStore.getState().isActive) {
        keyboardOnlyActions.exit();
      } else {
        keyboardOnlyActions.enter();
      }
    };

    const onBlur = () => {
      const result = reduceKeyboardOnlyDetector(stateRef.current, {
        type: "reset",
      });
      stateRef.current = result.state;
    };

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("blur", onBlur);

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("keyup", onKeyUp, true);
      window.removeEventListener("blur", onBlur);
    };
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
      stateRef.current = createKeyboardOnlyDetectorState();
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [isActive]);
}
