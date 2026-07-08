import { useLayoutEffect } from "react";
import {
  SIDEBAR_AUTO_COLLAPSE_BREAKPOINT,
  TASK_LIST_AUTO_COLLAPSE_BREAKPOINT,
} from "@web/common/constants/responsive.constants";
import { readSidebarOpen } from "@web/common/storage/sidebar-open.storage";
import { viewActions } from "@web/events/stores/view.store";

/**
 * Syncs panel visibility in the view store with the window size. Panels
 * auto-collapse below their breakpoint regardless of any saved preference,
 * but reopening above it restores the user's last manual choice (persisted
 * via toggleSidebar), so a breakpoint crossing never overrides a preference
 * a refresh would otherwise honor. Mount once per app (AuthenticatedLayout)
 * so overrides survive view switches.
 */
export function useResponsiveLayout() {
  useLayoutEffect(() => {
    const panelQueries = [
      {
        query: window.matchMedia(
          `(min-width: ${SIDEBAR_AUTO_COLLAPSE_BREAKPOINT}px)`,
        ),
        setOpen: (matches: boolean) =>
          viewActions.setSidebarOpen(matches && readSidebarOpen()),
      },
      {
        query: window.matchMedia(
          `(min-width: ${TASK_LIST_AUTO_COLLAPSE_BREAKPOINT}px)`,
        ),
        setOpen: viewActions.setTaskListOpen,
      },
    ];

    const cleanups = panelQueries.map(({ query, setOpen }) => {
      setOpen(query.matches);
      const onChange = (e: MediaQueryListEvent) => setOpen(e.matches);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    });

    return () => cleanups.forEach((cleanup) => cleanup());
  }, []);
}
