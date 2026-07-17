import { type RefObject, useCallback, useEffect } from "react";
import { onViewCommand } from "@web/common/utils/dom/view-command-bus";
import { getCurrentMinute } from "@web/common/utils/grid/grid.util";
import { TIMED_VISIBLE_HOURS } from "@web/grid/grid.constants";

export const useDayCalendarScrollToNow = (
  mainGridRef: RefObject<HTMLElement | null>,
) => {
  const scrollToNow = useCallback(() => {
    const timedGrid = mainGridRef.current;
    if (!timedGrid) return;

    const minuteHeight = timedGrid.clientHeight / TIMED_VISIBLE_HOURS / 60;
    timedGrid.scroll({
      behavior: "smooth",
      top: getCurrentMinute() * minuteHeight - 150,
    });
  }, [mainGridRef]);

  useEffect(() => {
    if (mainGridRef.current) scrollToNow();
  }, [mainGridRef, scrollToNow]);

  // scrollToNow is stable (depends only on the stable mainGridRef), and
  // onViewCommand returns its own unsubscribe, so subscribe directly.
  useEffect(
    () => onViewCommand("SCROLL_TO_NOW_LINE", scrollToNow),
    [scrollToNow],
  );
};
