import { type CloseButtonProps } from "react-toastify";
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";

/** Replaces react-toastify's default × so Escape-to-dismiss is visible. */
export function ToastCloseButton({
  closeToast,
  ariaLabel = "Dismiss",
}: CloseButtonProps) {
  return (
    <button
      aria-label={ariaLabel}
      className="c-focus-ring inline-flex items-center gap-1 rounded-xs text-text-muted hover:text-text"
      onClick={closeToast}
      type="button"
    >
      <span aria-hidden>×</span>
      <ShortcutKeys keys="Esc" />
    </button>
  );
}
