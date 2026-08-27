import { type ReactNode } from "react";
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";
import { isEventJumpActive } from "@web/shortcuts/shift-hint/event-jump.store";
import { useAppShortcut } from "@web/shortcuts/useAppShortcut";
import { isEditSequenceArmed } from "@web/shortcuts/useEditSequenceShortcut";

export const TOAST_PRIMARY_ACTION_KEY = "1";

const canHandleShortcut = (event: KeyboardEvent) =>
  !event.isComposing &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.altKey &&
  !event.shiftKey &&
  !isEventJumpActive() &&
  !isEditSequenceArmed();

export function ToastActionButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  // Digit 1 runs this toast CTA while mounted. Yields to typing (ignoreInputs),
  // app-lock, event-jump, and an armed `e`… sequence.
  useAppShortcut(
    TOAST_PRIMARY_ACTION_KEY,
    (event) => {
      if (!canHandleShortcut(event)) return;
      onClick();
    },
    {
      ignoreInputs: true,
      preventDefault: true,
      stopPropagation: true,
    },
  );

  return (
    <button
      className="flex w-full items-center justify-center gap-2 rounded bg-accent-secondary px-3 py-2 font-medium text-on-accent text-sm transition-colors hover:bg-accent-secondary-hover"
      onClick={onClick}
      type="button"
    >
      {children}
      <ShortcutKeys keys={TOAST_PRIMARY_ACTION_KEY} />
    </button>
  );
}
