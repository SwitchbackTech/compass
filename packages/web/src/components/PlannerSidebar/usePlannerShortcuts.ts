import { useCallback, useEffect, useState } from "react";
import { useAppHotkeyUp } from "@web/common/hooks/useAppHotkey";

const TOGGLE_SHORTCUTS_HOTKEY = { key: "?", shift: true } as const;
const TOGGLE_SHORTCUTS_SLASH_HOTKEY = { key: "/", shift: true } as const;

interface UsePlannerShortcutsArgs {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function usePlannerShortcuts({
  isSidebarOpen,
  onToggleSidebar,
}: UsePlannerShortcutsArgs) {
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

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

  useAppHotkeyUp(TOGGLE_SHORTCUTS_HOTKEY, toggleShortcuts);
  useAppHotkeyUp(TOGGLE_SHORTCUTS_SLASH_HOTKEY, toggleShortcuts);

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
