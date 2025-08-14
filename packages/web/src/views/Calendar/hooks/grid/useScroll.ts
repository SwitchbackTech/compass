import { MutableRefObject, useCallback, useEffect } from "react";
import { getCurrentMinute } from "@web/common/utils/grid.util";

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

  // Scroll when pressing "c"
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isTypingField =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (!isTypingField && !event.ctrlKey && event.key.toLowerCase() === "c") {
        scrollToNow();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [scrollToNow]);

  // Optional: scroll to now on mount
  useEffect(() => {
    if (!timedGridRef.current) return;
    scrollToNow();
  }, [scrollToNow, timedGridRef]);

  return { scrollToNow };
};

export type Util_Scroll = ReturnType<typeof useScroll>;
