import { useLayoutEffect } from "react";
import { readSidebarOpen } from "@web/common/storage/sidebar-open.storage";
import { SIDEBAR_AUTO_COLLAPSE_BREAKPOINT } from "@web/components/AuthenticatedLayout/responsive.constants";
import { viewActions } from "@web/events/stores/view.store";

/**
 * Syncs sidebar visibility in the view store with the window size. The sidebar
 * auto-collapses below its breakpoint regardless of any saved preference, but
 * reopening above it restores the user's last manual choice (persisted via
 * toggleSidebar), so a breakpoint crossing never overrides a preference a
 * refresh would otherwise honor. Mount once per app (AuthenticatedLayout) so
 * overrides survive view switches.
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
