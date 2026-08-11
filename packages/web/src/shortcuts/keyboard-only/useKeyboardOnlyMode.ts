import { useEffect } from "react";
import { isEditableKeyboardTarget } from "@web/common/utils/form/form.util";
import { isAppLocked } from "@web/shortcuts/app-lock";
import { isHigherEscapeOwner } from "@web/shortcuts/escape-ownership";
import { isBareLetterKey } from "@web/shortcuts/is-bare-letter-key";
import {
  keyboardOnlyActions,
  useKeyboardOnlyStore,
} from "@web/shortcuts/keyboard-only/keyboard-only.store";

/**
 * Bare `h` toggles keyboard-only (Hardcore) mode. Clicks are inert; ESC, `h`
 * again, or refresh exits. Mode is not persisted.
 *
 * ESC stands down while app lock, floating layers, or the event form own Escape
 * so those dismiss first; a later ESC exits this mode.
 */
export function useKeyboardOnlyMode() {
  const isActive = useKeyboardOnlyStore((state) => state.isActive);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;

      if (event.key === "Escape") {
        if (!useKeyboardOnlyStore.getState().isActive) return;
        if (isHigherEscapeOwner()) return;

        event.preventDefault();
        event.stopPropagation();
        keyboardOnlyActions.exit();
        return;
      }

      if (!isBareLetterKey(event, "h")) return;
      if (isAppLocked() || isEditableKeyboardTarget(event)) return;

      event.preventDefault();
      event.stopPropagation();
      if (useKeyboardOnlyStore.getState().isActive) {
        keyboardOnlyActions.exit();
      } else {
        keyboardOnlyActions.enter();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, []);

  // Click suppression while active. Window capture runs before React's
  // delegated root listeners (and grid PointerCaptureBoundary), so clicks
  // never reach event open handlers. Scroll and hover stay live.
  useEffect(() => {
    if (!isActive) return;

    const blockPointer = (event: Event) => {
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest("[data-onboarding-tour]")
      ) {
        return;
      }
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
}
