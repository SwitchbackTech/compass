import { useCallback, useEffect, useState } from "react";

export interface ContextMenuState {
  x: number;
  y: number;
  eventId: string;
}

export interface ContextMenuActions {
  onRename: (eventId: string) => void;
  onSetPriority: (
    eventId: string,
    priority: "Work" | "Self" | "Relationships",
  ) => void;
  onDelete: (eventId: string) => void;
}

export interface UseContextMenuOptions {
  actions: ContextMenuActions;
  onClose?: () => void;
}

export interface UseContextMenuReturn {
  contextMenu: ContextMenuState | null;
  showContextMenu: (x: number, y: number, eventId: string) => void;
  hideContextMenu: () => void;
  isOpen: boolean;
}

export function useContextMenu({
  actions,
  onClose,
}: UseContextMenuOptions): UseContextMenuReturn {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const showContextMenu = useCallback(
    (x: number, y: number, eventId: string) => {
      const MENU_W = 220;
      const MENU_H = 180;
      const vw = typeof window !== "undefined" ? window.innerWidth : 1000;
      const vh = typeof window !== "undefined" ? window.innerHeight : 800;

      const clampedX = Math.max(8, Math.min(x, vw - MENU_W - 8));
      const clampedY = Math.max(8, Math.min(y, vh - MENU_H - 8));

      setContextMenu({ x: clampedX, y: clampedY, eventId });
    },
    [],
  );

  const hideContextMenu = useCallback(() => {
    setContextMenu(null);
    onClose?.();
  }, [onClose]);

  // Handle keyboard shortcuts when context menu is open
  useEffect(() => {
    if (!contextMenu) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      if (key === "escape") {
        e.preventDefault();
        hideContextMenu();
        return;
      }

      if (key === "w" || key === "s" || key === "r") {
        e.preventDefault();
        const { eventId } = contextMenu;

        if (key === "w") actions.onSetPriority(eventId, "Work");
        if (key === "s") actions.onSetPriority(eventId, "Self");
        if (key === "r") actions.onSetPriority(eventId, "Relationships");

        hideContextMenu();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [contextMenu, actions, hideContextMenu]);

  // Handle click outside to close context menu
  useEffect(() => {
    if (!contextMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-testid="event-context-menu"]')) {
        hideContextMenu();
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      hideContextMenu();
    };

    document.addEventListener("click", handleClickOutside);
    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [contextMenu, hideContextMenu]);

  return {
    contextMenu,
    showContextMenu,
    hideContextMenu,
    isOpen: !!contextMenu,
  };
}
