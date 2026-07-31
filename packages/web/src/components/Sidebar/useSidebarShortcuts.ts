import { useCallback, useEffect, useState } from "react";
import { useAppLockReason } from "@web/shortcuts/app-lock";
import { useAppShortcutUp } from "@web/shortcuts/useAppShortcut";

const TOGGLE_SHORTCUTS_HOTKEY = { key: "?", shift: true } as const;
const TOGGLE_SHORTCUTS_SLASH_HOTKEY = { key: "/", shift: true } as const;

interface UseSidebarShortcutsArgs {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function useSidebarShortcuts({
  isSidebarOpen,
  onToggleSidebar,
}: UseSidebarShortcutsArgs) {
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  useAppLockReason("shortcutsOverlay", isShortcutsOpen);

  const closeShortcuts = useCallback(() => {
    setIsShortcutsOpen(false);
  }, []);

  const toggleShortcuts = useCallback(() => {
    if (!isSidebarOpen) {
      onToggleSidebar();
      setIsShortcutsOpen(true);
      return;
    }

    setIsShortcutsOpen((isOpen) => !isOpen);
  }, [isSidebarOpen, onToggleSidebar]);

  useAppShortcutUp(TOGGLE_SHORTCUTS_HOTKEY, toggleShortcuts, {
    ignoreAppLock: true,
  });
  useAppShortcutUp(TOGGLE_SHORTCUTS_SLASH_HOTKEY, toggleShortcuts, {
    ignoreAppLock: true,
  });

  useEffect(() => {
    if (!isSidebarOpen) {
      closeShortcuts();
    }
  }, [closeShortcuts, isSidebarOpen]);

  return {
    closeShortcuts,
    isShortcutsOpen,
    toggleShortcuts,
  };
}
