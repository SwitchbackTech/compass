import { useEffect } from "react";
import {
  POINTER_ACTIONS,
  requestPointerEventJump,
  resolveBlockedPointerAttempt,
} from "@web/shortcuts/keyboard-only/pointer-action";
import {
  createPointerBlockListener,
  POINTER_BLOCK_EVENT_TYPES,
} from "@web/shortcuts/keyboard-only/pointer-block";
import { pointerBlockActions } from "@web/shortcuts/keyboard-only/pointer-block.store";
import { eventJumpActions } from "@web/shortcuts/shift-hint/event-jump.store";

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
    const { onPointerEvent, onKeyDown } = createPointerBlockListener({
      onBlockedGesture: (event) => {
        const attempt = resolveBlockedPointerAttempt(
          event.composedPath?.() ?? [],
        );
        pointerBlockActions.pulseBlockedClick(attempt);
        if (attempt.actionId === POINTER_ACTIONS.eventOpen && attempt.eventId) {
          // Never let a prior event's assignment flash for a new/locked target.
          eventJumpActions.setPointerHintKey(null);
          requestPointerEventJump(attempt.eventId);
        }
      },
    });

    for (const type of POINTER_BLOCK_EVENT_TYPES) {
      window.addEventListener(type, onPointerEvent, true);
    }
    const handleKeyDown = (event: KeyboardEvent) => onKeyDown(event);
    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      for (const type of POINTER_BLOCK_EVENT_TYPES) {
        window.removeEventListener(type, onPointerEvent, true);
      }
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, []);
}
