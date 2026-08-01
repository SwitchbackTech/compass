import { useLayoutEffect, useState } from "react";
import { SIDEBAR_AUTO_COLLAPSE_BREAKPOINT } from "@web/components/AuthenticatedLayout/responsive.constants";

/**
 * True when the viewport is below the sidebar auto-collapse breakpoint.
 * On these widths the open sidebar can squeeze the calendar header enough
 * that its toggle is clipped, so the sidebar itself must host a close
 * control.
 */
export function useIsNarrowSidebarLayout() {
  const [isNarrow, setIsNarrow] = useState(
    () =>
      !window.matchMedia(`(min-width: ${SIDEBAR_AUTO_COLLAPSE_BREAKPOINT}px)`)
        .matches,
  );

  useLayoutEffect(() => {
    const query = window.matchMedia(
      `(min-width: ${SIDEBAR_AUTO_COLLAPSE_BREAKPOINT}px)`,
    );
    const onChange = () => setIsNarrow(!query.matches);
    onChange();
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return isNarrow;
}
