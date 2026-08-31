import { useEffect } from "react";
import {
  type BlockedPointerAttempt,
  pointerGridIntentFromPointer,
  requestPointerEventJump,
  requestPointerGridCreate,
  teachingFromBlockedPointer,
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
        const path = event.composedPath?.() ?? [];
        const { attempt: baseAttempt, jumpEventId } =
          teachingFromBlockedPointer(path, event.button ?? 0);
        const gridIntent =
          baseAttempt.actionId === "unknown"
            ? pointerGridIntentFromPointer(
                path,
                event.clientX ?? 0,
                event.clientY ?? 0,
              )
            : null;
        const attempt: BlockedPointerAttempt = gridIntent
          ? {
              actionId:
                gridIntent.kind === "timed" ? "grid.timed" : "grid.all-day",
              gridDate: gridIntent.date,
              gridTimeKey: gridIntent.timeKey,
              gridTimeLabel: gridIntent.timeLabel,
            }
          : baseAttempt;
        pointerBlockActions.pulseBlockedClick(attempt);
        if (gridIntent) {
          eventJumpActions.setActive(false);
          requestPointerGridCreate(gridIntent);
          return;
        }
        if (jumpEventId) {
          // Never let a prior event's assignment flash for a new/locked target.
          eventJumpActions.setPointerHint(null);
          requestPointerEventJump(jumpEventId);
        } else {
          // Jump mode swallows unmatched printable keys, including `]`.
          eventJumpActions.setActive(false);
        }
      },
    });

    for (const type of POINTER_BLOCK_EVENT_TYPES) {
      window.addEventListener(type, onPointerEvent, true);
    }
    window.addEventListener("keydown", onKeyDown, true);

    return () => {
      for (const type of POINTER_BLOCK_EVENT_TYPES) {
        window.removeEventListener(type, onPointerEvent, true);
      }
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, []);
}
