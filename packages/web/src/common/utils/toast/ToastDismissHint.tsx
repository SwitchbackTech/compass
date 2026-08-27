import { ShortcutTipParts } from "@web/shortcuts/tips/ShortcutTipParts";

const DISMISS_TIP_PARTS = ["Press ", { key: "Esc" }, " to dismiss"] as const;

/** Footer tip so Escape-to-dismiss is visible without a close control. */
export function ToastDismissHint() {
  return (
    <p className="text-text-muted text-xs" role="note">
      <ShortcutTipParts parts={DISMISS_TIP_PARTS} />
    </p>
  );
}
