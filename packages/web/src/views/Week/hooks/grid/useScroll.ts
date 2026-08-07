import { type MutableRefObject, useCallback, useEffect } from "react";
import { getScrollToNowTop } from "@web/common/utils/grid/grid.util";

export const useScroll = (
  timedGridRef: MutableRefObject<HTMLElement | null>,
) => {
  const scrollToNow = useCallback(() => {
    if (!timedGridRef.current) return;

    timedGridRef.current.scroll({
      top: getScrollToNowTop(timedGridRef.current.clientHeight),
      behavior: "smooth",
    });
  }, [timedGridRef]);

  // Optional: scroll to now on mount. "t" (today) owns scroll-to-now while
  // viewing the current week; do not bind "c" here — that creates a draft.
  useEffect(() => {
    if (!timedGridRef.current) return;
    scrollToNow();
  }, [scrollToNow, timedGridRef]);

  return { scrollToNow };
};

export type Util_Scroll = ReturnType<typeof useScroll>;
