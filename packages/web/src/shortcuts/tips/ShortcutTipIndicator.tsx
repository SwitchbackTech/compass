import { type FC, useEffect } from "react";
import { ShortcutTipParts } from "@web/shortcuts/tips/ShortcutTipParts";
import { beginShortcutSuggestionPresentation } from "@web/shortcuts/tips/shortcut-telemetry";
import { type RankedShortcutHint } from "@web/shortcuts/tips/shortcut-tips.data";

/**
 * Always-on next-shortcut in the sidebar status bar. Pure display: the
 * caller (SidebarStatusBar) chooses this after mode and operational status.
 */
export const ShortcutTipIndicator: FC<{ hint: RankedShortcutHint }> = ({
  hint,
}) => {
  const { actionId, featureArea, id, rank, reasonCode } = hint;
  useEffect(
    () =>
      beginShortcutSuggestionPresentation({
        actionId,
        featureArea,
        id,
        rank,
        reasonCode,
      }),
    [actionId, featureArea, id, rank, reasonCode],
  );

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
