import { type HTMLAttributes, type ReactNode } from "react";
import { ID_SIDEBAR } from "@web/common/constants/web.constants";
import {
  selectIsEventFormOpen,
  useDraftStore,
} from "@web/events/stores/draft.store";
import {
  selectIsSidebarOpen,
  useViewStore,
} from "@web/events/stores/view.store";
import { type ShortcutOverlaySection } from "@web/shortcuts/shortcuts-overlay.types";
import { useIsNarrowSidebarLayout } from "./hooks/useIsNarrowSidebarLayout";
import { ShortcutsOverlay } from "./ShortcutsOverlay/ShortcutsOverlay";
import { SidebarActions } from "./SidebarActions/SidebarActions";
import { SidebarCloseButton } from "./SidebarCloseButton";
import { SidebarStatusBar } from "./SidebarStatusBar";

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
  const isNarrowLayout = useIsNarrowSidebarLayout();
  const isSidebarOpen = useViewStore(selectIsSidebarOpen);
  const isEventFormOpen = useDraftStore(selectIsEventFormOpen);
  // Day/Week keep the panel mounted for event details even when the sidebar
  // preference is closed; keep dismiss available for that case too.
  const showSidebarClose = isNarrowLayout && (isSidebarOpen || isEventFormOpen);

  return (
    <aside
      {...props}
      aria-label="Sidebar"
      className="relative flex h-full w-full min-w-0 flex-col overflow-hidden bg-surface-panel pt-5 text-text"
      id={ID_SIDEBAR}
    >
      {showSidebarClose ? (
        <div className="flex shrink-0 items-center justify-end px-5 pb-2">
          <SidebarCloseButton />
        </div>
      ) : null}
      {children}
      <SidebarStatusBar />
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
