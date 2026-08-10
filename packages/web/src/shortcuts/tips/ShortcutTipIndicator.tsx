import { type FC } from "react";
import { track } from "@web/auth/posthog/track";
import {
  getShortcutTips,
  type ShortcutTipId,
} from "@web/shortcuts/tips/shortcut-tips.data";
import {
  selectActiveShortcutTipId,
  shortcutTipsActions,
  useShortcutTipsStore,
} from "@web/shortcuts/tips/shortcut-tips.store";

const getTipText = (id: ShortcutTipId | null): string | null =>
  id === null
    ? null
    : (getShortcutTips().find((tip) => tip.id === id)?.text ?? null);

/**
 * Quiet, single-line rotation in the sidebar status bar. Pure display: the
 * caller (SidebarStatusBar) runs useShortcutTipTrigger unconditionally and
 * only mounts this when a tip is active, mirroring the other indicators.
 */
export const ShortcutTipIndicator: FC = () => {
  const activeTipId = useShortcutTipsStore(selectActiveShortcutTipId);
  const text = getTipText(activeTipId);

  if (!text || !activeTipId) return null;

  const onMute = () => {
    track("shortcut_tip_acted_on", { tip: activeTipId, action: "muted" });
    shortcutTipsActions.mute();
  };

  return (
    <button
      aria-label={`${text}. Click to hide these tips.`}
      className="c-focus-ring truncate text-left text-text-muted text-xs opacity-80 hover:opacity-100"
      onClick={onMute}
      title="Click to hide shortcut tips"
      type="button"
    >
      <span aria-live="polite" role="status">
        {text}
      </span>
    </button>
  );
};
