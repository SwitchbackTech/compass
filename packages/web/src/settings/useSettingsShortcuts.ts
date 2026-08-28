import { useEffect } from "react";
import { isEditableKeyboardTarget } from "@web/common/utils/form/form.util";
import { type SettingsPage } from "@web/settings/settings.store";
import { physicalDigitIndex } from "@web/shortcuts/digit-pick.util";
import { normalizedKeyboardKey } from "@web/shortcuts/is-bare-letter-key";
import { useModHoldHintShortcut } from "@web/shortcuts/mod-hold/useModHoldHintShortcut";

export const SETTINGS_SHORTCUT_ATTR = "data-settings-shortcut";

export const settingsShortcutAttrs = (id: string) =>
  ({ [SETTINGS_SHORTCUT_ATTR]: id }) as const;

const clickSettingsShortcut = (id: string): boolean => {
  const el = document.querySelector<HTMLElement>(
    `[${SETTINGS_SHORTCUT_ATTR}="${id}"]`,
  );
  if (!el || el.hasAttribute("disabled")) return false;
  // Programmatic click does not move focus. Seat it on the target so a
  // following Enter activates this control instead of the previous one
  // (Accounts stays focused after 2, which would jump back).
  el.focus({ preventScroll: true });
  el.click();
  return true;
};

/**
 * Maps a key to a Settings control. Nav digits 1/2 always win over in-page
 * actions so a user looking at Accounts can still jump to Billing. Disconnect
 * rows therefore have no digit shortcut (hover + Enter activates them).
 */
const shortcutIdForEvent = (
  event: KeyboardEvent,
  page: SettingsPage,
  hasBilling: boolean,
): string | null => {
  const digit = physicalDigitIndex(event);
  if (digit === 0) return "nav-accounts";
  if (digit === 1) return hasBilling ? "nav-billing" : null;

  const key = normalizedKeyboardKey(event);
  if (page === "billing" && key === "m") return "manage-billing";
  if (page !== "accounts") return null;
  if (key === "a") return "add-account";
  if (key === "e") return "export";
  if (key === "d") return "delete-account";
  if (key === "o") return "log-out";
  return null;
};

/**
 * Page-local Settings shortcuts. Calendar letter keys are free while the
 * modal holds app-lock; chips appear on Mod down (no 600ms delay) so the
 * gesture matches the welcome modal rather than page-jump.
 */
export function useSettingsShortcuts({
  enabled,
  hasBilling,
  page,
}: {
  enabled: boolean;
  hasBilling: boolean;
  page: SettingsPage;
}): { areHintsVisible: boolean } {
  const { areHintsVisible } = useModHoldHintShortcut({
    enabled,
    holdMs: 0,
    ignoreAppLock: true,
    onModChord: (event) => {
      const id = shortcutIdForEvent(event, page, hasBilling);
      if (!id) return false;
      return clickSettingsShortcut(id);
    },
  });

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isEditableKeyboardTarget(event)) return;

      const id = shortcutIdForEvent(event, page, hasBilling);
      if (!id) return;

      event.preventDefault();
      event.stopPropagation();
      clickSettingsShortcut(id);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [enabled, hasBilling, page]);

  return { areHintsVisible };
}
