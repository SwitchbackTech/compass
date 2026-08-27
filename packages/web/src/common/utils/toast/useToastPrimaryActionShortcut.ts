import { isEventJumpActive } from "@web/shortcuts/shift-hint/event-jump.store";
import { useAppShortcut } from "@web/shortcuts/useAppShortcut";
import { isEditSequenceArmed } from "@web/shortcuts/useEditSequenceShortcut";
import { TOAST_PRIMARY_ACTION_KEY } from "./ToastActionButton";

const canHandleShortcut = (event: KeyboardEvent) =>
  !event.isComposing &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.altKey &&
  !event.shiftKey &&
  !isEventJumpActive() &&
  !isEditSequenceArmed();

/**
 * Digit 1 runs the visible toast CTA while that toast is mounted. Yields to
 * typing (ignoreInputs), app-lock, event-jump, and an armed `e`… sequence.
 */
export function useToastPrimaryActionShortcut(onAction: () => void) {
  useAppShortcut(
    TOAST_PRIMARY_ACTION_KEY,
    (event) => {
      if (!canHandleShortcut(event)) return;
      onAction();
    },
    {
      ignoreInputs: true,
      preventDefault: true,
      stopPropagation: true,
    },
  );
}
