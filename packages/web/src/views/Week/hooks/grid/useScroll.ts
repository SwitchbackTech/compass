import { type MutableRefObject, useCallback, useEffect } from "react";
import {
  getCurrentMinute,
  getMinuteHeight,
} from "@web/common/utils/grid/grid.util";
import { useAppShortcut } from "@web/shortcuts/useAppShortcut";

export const useScroll = (
  timedGridRef: MutableRefObject<HTMLElement | null>,
) => {
  const scrollToNow = useCallback(() => {
    const minuteHeight = getMinuteHeight(
      timedGridRef.current?.clientHeight || 0,
    );

    const buffer = 150;
    const top = getCurrentMinute() * minuteHeight - buffer;

    if (timedGridRef.current) {
      timedGridRef.current.scroll({
        top,
        behavior: "smooth",
      });
    }
  }, [timedGridRef]);

  // Scroll when pressing "c"
  useAppShortcut("C", scrollToNow);

  // Optional: scroll to now on mount
  useEffect(() => {
    if (!timedGridRef.current) return;
    scrollToNow();
  }, [scrollToNow, timedGridRef]);

  return { scrollToNow };
};

export type Util_Scroll = ReturnType<typeof useScroll>;
