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
  const { actionId, featureArea, id, reasonCode } = hint;
  useEffect(
    () =>
      beginShortcutSuggestionPresentation({
        actionId,
        featureArea,
        id,
        reasonCode,
      }),
    [actionId, featureArea, id, reasonCode],
  );

  return (
    <span
      aria-live="polite"
      className="block w-full text-pretty break-words text-center text-text-muted text-xs leading-5 opacity-80"
      role="status"
    >
      <ShortcutTipParts parts={hint.parts} />
    </span>
  );
};
