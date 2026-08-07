import { useLayoutEffect } from "react";
import { SIDEBAR_AUTO_COLLAPSE_BREAKPOINT } from "@web/components/AuthenticatedLayout/responsive.constants";
import {
  selectSidebarPreference,
  useViewStore,
  viewActions,
} from "@web/events/stores/view.store";

/**
 * Syncs sidebar visibility in the view store with the window size. The sidebar
 * auto-collapses below its breakpoint regardless of any saved preference, but
 * reopening above it restores the user's last manual choice (persisted via
 * setSidebarOpen/toggleSidebar), so a breakpoint crossing never overrides a
 * preference a refresh would otherwise honor. Mount once per app
 * (AuthenticatedLayout) so overrides survive view switches.
 */
export function useResponsiveLayout() {
  useLayoutEffect(() => {
    const panelQueries = [
      {
        query: window.matchMedia(
          `(min-width: ${SIDEBAR_AUTO_COLLAPSE_BREAKPOINT}px)`,
        ),
        setOpen: (matches: boolean) =>
          viewActions.syncSidebarOpen(
            matches && selectSidebarPreference(useViewStore.getState()),
          ),
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
