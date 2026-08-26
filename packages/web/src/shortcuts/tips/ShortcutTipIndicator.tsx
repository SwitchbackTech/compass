import { type FC } from "react";
import { ShortcutTipParts } from "@web/shortcuts/tips/ShortcutTipParts";
import { type ShortcutHint } from "@web/shortcuts/tips/shortcut-tips.data";

/**
 * Always-on next-shortcut in the sidebar status bar. Pure display: the
 * caller (SidebarStatusBar) chooses this after mode and operational status.
 */
export const ShortcutTipIndicator: FC<{ hint: ShortcutHint }> = ({ hint }) => {
  return (
    <span
      aria-live="polite"
      className="truncate text-text-muted text-xs opacity-80"
      role="status"
    >
      <ShortcutTipParts parts={hint.parts} />
    </span>
  );
};
