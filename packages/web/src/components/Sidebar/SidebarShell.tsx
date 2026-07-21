import { type HTMLAttributes, type ReactNode } from "react";
import { ID_SIDEBAR } from "@web/common/constants/web.constants";
import { type ShortcutOverlaySection } from "@web/components/Shortcuts/ShortcutOverlay/ShortcutsOverlay";
import { ShortcutsOverlay } from "./ShortcutsOverlay/ShortcutsOverlay";
import { SidebarActions } from "./SidebarActions/SidebarActions";

interface SidebarShellProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  isShortcutsOpen: boolean;
  onCloseShortcuts: () => void;
  onToggleShortcuts: () => void;
  shortcutSections: ShortcutOverlaySection[];
  shortcutsViewLabel?: string;
  SidebarActionsComponent?: typeof SidebarActions;
  ShortcutsOverlayComponent?: typeof ShortcutsOverlay;
}

export function SidebarShell({
  children,
  isShortcutsOpen,
  onCloseShortcuts,
  onToggleShortcuts,
  shortcutSections,
  shortcutsViewLabel,
  SidebarActionsComponent = SidebarActions,
  ShortcutsOverlayComponent = ShortcutsOverlay,
  ...props
}: SidebarShellProps) {
  return (
    <aside
      {...props}
      aria-label="Sidebar"
      className="relative flex h-full w-full min-w-0 flex-col overflow-hidden bg-surface-panel pt-5 text-text"
      id={ID_SIDEBAR}
    >
      {children}
      <SidebarActionsComponent
        isShortcutsOpen={isShortcutsOpen}
        onToggleShortcuts={onToggleShortcuts}
      />
      <ShortcutsOverlayComponent
        isOpen={isShortcutsOpen}
        onClose={onCloseShortcuts}
        sections={shortcutSections}
        viewLabel={shortcutsViewLabel}
      />
    </aside>
  );
}
