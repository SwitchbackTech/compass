import { type MutableRefObject, useEffect, useRef } from "react";
import { useDraftContext } from "@web/views/Week/components/Draft/context/useDraftContext";

const SCROLL_SPEED = 10;
const EDGE_THRESHOLD = 50;

export const useDragEventSmartScroll = (
  mainGridRef: MutableRefObject<HTMLDivElement | null>,
) => {
  const { state } = useDraftContext();
  const mouseYRef = useRef(0);
  const scrollRef = useRef<number | null>(null);

  useEffect(() => {
    if (!state.isDragging) return;
    if (state.draft?.isAllDay !== false) return;
    if (!mainGridRef.current) return;
    const container = mainGridRef.current;

    const scheduleScroll = () => {
      if (scrollRef.current !== null) return;

      scrollRef.current = requestAnimationFrame(scrollIfNeeded);
    };

    const scrollIfNeeded = () => {
      scrollRef.current = null;

      if (!state.isDragging) return;
      if (state.draft?.isAllDay !== false) return;

      const containerRect = container.getBoundingClientRect();
      const { top, bottom } = {
        top: containerRect.top,
        bottom: containerRect.bottom - 100,
      };
      let scrollAmount = 0;

      const isAtTop = container.scrollTop === 0;
      const isAtBottom =
        container.scrollTop + container.clientHeight >= container.scrollHeight;

      if (mouseYRef.current < top + EDGE_THRESHOLD && !isAtTop) {
        scrollAmount = -SCROLL_SPEED;
      } else if (mouseYRef.current > bottom - EDGE_THRESHOLD && !isAtBottom) {
        scrollAmount = SCROLL_SPEED;
      }

      if (scrollAmount !== 0) {
        container.scrollTop += scrollAmount;
        scheduleScroll();
      }
    };

    const updateMousePosition = (event: MouseEvent) => {
      mouseYRef.current = event.clientY;
      scheduleScroll();
    };

    window.addEventListener("mousemove", updateMousePosition);
    scheduleScroll();

    return () => {
      window.removeEventListener("mousemove", updateMousePosition);

      if (scrollRef.current !== null) {
        cancelAnimationFrame(scrollRef.current);
        scrollRef.current = null;
      }
    };
  }, [mainGridRef, state.draft?.isAllDay, state.isDragging]);
};
