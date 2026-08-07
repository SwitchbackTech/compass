import {
  selectIsShortcutsOpen,
  useViewStore,
  viewActions,
} from "@web/events/stores/view.store";
import { useAppLockReason } from "@web/shortcuts/app-lock";
import { useAppShortcutUp } from "@web/shortcuts/useAppShortcut";

const TOGGLE_SHORTCUTS_HOTKEY = { key: "?", shift: true } as const;
const TOGGLE_SHORTCUTS_SLASH_HOTKEY = { key: "/", shift: true } as const;

/** Mount once per view: registers the `?`/`/` hotkeys and holds the app-lock
 * while the overlay is open. State itself lives in view.store, next to
 * sidebar.isOpen, since opening/closing either one affects the other. */
export function useSidebarShortcuts() {
  const isShortcutsOpen = useViewStore(selectIsShortcutsOpen);
  useAppLockReason("shortcutsOverlay", isShortcutsOpen);

  useAppShortcutUp(TOGGLE_SHORTCUTS_HOTKEY, viewActions.toggleShortcuts, {
    ignoreAppLock: true,
  });
  useAppShortcutUp(TOGGLE_SHORTCUTS_SLASH_HOTKEY, viewActions.toggleShortcuts, {
    ignoreAppLock: true,
  });
}
