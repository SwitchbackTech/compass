import { getCurrentMinute } from "@web/common/utils/grid.util";
import { MutableRefObject, useCallback, useEffect } from "react";

export const useScroll = (
  timedGridRef: MutableRefObject<HTMLDivElement | null>,
) => {
  const scrollToNow = useCallback(() => {
    const rows = 11;
    const gridRowHeight = (timedGridRef.current?.clientHeight || 0) / rows;
    const minuteHeight = gridRowHeight / 60;

    const buffer = 150;
    const top = getCurrentMinute() * minuteHeight - buffer;

    if (timedGridRef.current) {
      timedGridRef.current.scroll({
        top,
        behavior: "smooth",
      });
    }
  }, [timedGridRef]);

  useEffect(() => {
    if (!timedGridRef.current) return;

    scrollToNow();
  }, [scrollToNow, timedGridRef]);

  return { scrollToNow };
};

export type Util_Scroll = ReturnType<typeof useScroll>;
