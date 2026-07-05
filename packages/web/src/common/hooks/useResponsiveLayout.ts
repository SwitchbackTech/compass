import { useLayoutEffect } from "react";
import {
  SIDEBAR_AUTO_COLLAPSE_BREAKPOINT,
  TASK_LIST_AUTO_COLLAPSE_BREAKPOINT,
} from "@web/common/constants/responsive.constants";
import { viewActions } from "@web/events/stores/view.store";

/**
 * Syncs panel visibility in the view store with the window size. Panels
 * auto-collapse/reopen only when a breakpoint is crossed, so a manual toggle
 * sticks until the next crossing. Mount once per app (AuthenticatedLayout) so
 * overrides survive view switches.
 */
export function useResponsiveLayout() {
  useLayoutEffect(() => {
    const panelQueries = [
      {
        query: window.matchMedia(
          `(min-width: ${SIDEBAR_AUTO_COLLAPSE_BREAKPOINT}px)`,
        ),
        setOpen: viewActions.setSidebarOpen,
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
