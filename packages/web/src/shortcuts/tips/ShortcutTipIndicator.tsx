import { type FC } from "react";
import { track } from "@web/auth/posthog/track";
import { ShortcutHint } from "@web/components/Shortcuts/ShortcutHint";
import {
  getShortcutTips,
  getTipPlainText,
  type ShortcutTip,
  type ShortcutTipId,
} from "@web/shortcuts/tips/shortcut-tips.data";
import {
  selectActiveShortcutTipId,
  shortcutTipsActions,
  useShortcutTipsStore,
} from "@web/shortcuts/tips/shortcut-tips.store";

const getTip = (id: ShortcutTipId | null): ShortcutTip | null =>
  id === null ? null : (getShortcutTips().find((tip) => tip.id === id) ?? null);

/**
 * Quiet, single-line rotation in the sidebar status bar. Pure display: the
 * caller (SidebarStatusBar) runs useShortcutTipTrigger unconditionally and
 * only mounts this when a tip is active, mirroring the other indicators.
 */
export const ShortcutTipIndicator: FC = () => {
  const activeTipId = useShortcutTipsStore(selectActiveShortcutTipId);
  const tip = getTip(activeTipId);

  if (!tip || !activeTipId) return null;

  const plainText = getTipPlainText(tip);

  const onMute = () => {
    track("shortcut_tip_acted_on", { tip: activeTipId, action: "muted" });
    shortcutTipsActions.mute();
  };

  return (
    <button
      aria-label={`${plainText}. Click to hide these tips.`}
      className="c-focus-ring truncate text-left text-text-muted text-xs opacity-80 hover:opacity-100"
      onClick={onMute}
      title="Click to hide shortcut tips"
      type="button"
    >
      <span aria-live="polite" role="status">
        <span className="sr-only">{plainText}</span>
        <span aria-hidden className="inline-flex items-center gap-1">
          {tip.parts.map((part, i) =>
            typeof part === "string" ? (
              // biome-ignore lint/suspicious/noArrayIndexKey: parts are a fixed, order-stable literal per tip
              <span key={i}>{part}</span>
            ) : (
              // biome-ignore lint/suspicious/noArrayIndexKey: parts are a fixed, order-stable literal per tip
              <ShortcutHint key={i}>{part.key}</ShortcutHint>
            ),
          )}
        </span>
      </span>
    </button>
  );
};
