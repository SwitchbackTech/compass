import { useEffect } from "react";
import {
  createPointerBlockListener,
  POINTER_BLOCK_EVENT_TYPES,
} from "@web/shortcuts/keyboard-only/pointer-block";
import { pointerBlockActions } from "@web/shortcuts/keyboard-only/pointer-block.store";

/**
 * Compass is the keyboard calendar: the mouse does nothing, permanently.
 * Window capture listeners run before React's delegated root listeners, so
 * pointer gestures never reach any handler. Scroll and hover stay live, and
 * shouldBlockPointerEvent passes keyboard-activation clicks (Enter/Space on a
 * native button), keyboard contextmenu (Shift+F10), and synthetic .click()
 * calls through. Blocked gestures pulse the store so PointerHint can teach.
 */
export function usePointerSuppression() {
  useEffect(() => {
    const blockPointer = createPointerBlockListener({
      onBlockedGesture: pointerBlockActions.pulseBlockedClick,
    });

    for (const type of POINTER_BLOCK_EVENT_TYPES) {
      window.addEventListener(type, blockPointer, true);
    }

    return () => {
      for (const type of POINTER_BLOCK_EVENT_TYPES) {
        window.removeEventListener(type, blockPointer, true);
      }
    };
  }, []);
}
