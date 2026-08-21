import { useEffect } from "react";
import { isEditableKeyboardTarget } from "@web/common/utils/form/form.util";
import { isAppLocked } from "@web/shortcuts/app-lock";
import { isHigherEscapeOwner } from "@web/shortcuts/escape-ownership";
import { isBareLetterKey } from "@web/shortcuts/is-bare-letter-key";
import {
  keyboardOnlyActions,
  useKeyboardOnlyStore,
} from "@web/shortcuts/keyboard-only/keyboard-only.store";
import {
  createPointerBlockListener,
  POINTER_BLOCK_EVENT_TYPES,
} from "@web/shortcuts/keyboard-only/pointer-block";
import { KEYMAP } from "@web/shortcuts/keymap";
import { eventJumpActions } from "@web/shortcuts/shift-hint/event-jump.store";
import { isEditSequenceArmed } from "@web/shortcuts/useEditSequenceShortcut";

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

      if (!isBareLetterKey(event, KEYMAP.hardcore.bareLetter)) return;
      if (isAppLocked() || isEditableKeyboardTarget(event)) return;
      // Yield to an armed `e`… edit sequence (same as event-jump `s`).
      if (isEditSequenceArmed()) return;

      event.preventDefault();
      event.stopPropagation();
      if (useKeyboardOnlyStore.getState().isActive) {
        keyboardOnlyActions.exit();
      } else {
        // Clear jump chips so Hardcore does not leave a second Esc owner.
        eventJumpActions.reset();
        keyboardOnlyActions.enter();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, []);

  // Pointer suppression while active. Window capture runs before React's
  // delegated root listeners (and grid PointerCaptureBoundary), so pointer
  // gestures never reach event open handlers. Scroll and hover stay live, and
  // shouldBlockPointerEvent passes keyboard-activation clicks (Enter/Space on
  // a native button) and synthetic .click() calls through.
  useEffect(() => {
    if (!isActive) return;

    const blockPointer = createPointerBlockListener({
      onBlockedGesture: keyboardOnlyActions.pulseBlockedClick,
    });

    for (const type of POINTER_BLOCK_EVENT_TYPES) {
      window.addEventListener(type, blockPointer, true);
    }

    return () => {
      for (const type of POINTER_BLOCK_EVENT_TYPES) {
        window.removeEventListener(type, blockPointer, true);
      }
    };
  }, [isActive]);
}
