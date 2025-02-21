import { useDraftContext } from "@web/views/Calendar/components/Draft/context/useDraftContext";
import { MutableRefObject, useEffect, useState, useRef } from "react";

const SCROLL_SPEED = 10;
const EDGE_THRESHOLD = 50;

export const useDragEventSmartScroll = (
  mainGridRef: MutableRefObject<HTMLDivElement | null>,
) => {
  const { state } = useDraftContext();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const scrollRef = useRef<number | null>(null);

  useEffect(() => {
    if (!state.isDragging) return;
    if (state.draft?.isAllDay) return;

    const updateMousePosition = (event: MouseEvent) => {
      setMousePosition({ x: event.clientX, y: event.clientY });
    };

    window.addEventListener("mousemove", updateMousePosition);

    return () => {
      window.removeEventListener("mousemove", updateMousePosition);
    };
  }, [state.isDragging]);

  useEffect(() => {
    if (!mainGridRef.current) return;

    const container = mainGridRef.current;

    const scrollIfNeeded = () => {
      if (!container) return;

      const { top, bottom } = container.getBoundingClientRect();
      const { y } = mousePosition;

      let scrollAmount = 0;

      const isAtTop = container.scrollTop === 0;
      const isAtBottom =
        container.scrollTop + container.clientHeight >= container.scrollHeight;

      if (y < top + EDGE_THRESHOLD && !isAtTop) {
        scrollAmount = -SCROLL_SPEED;
      } else if (y > bottom - EDGE_THRESHOLD && !isAtBottom) {
        scrollAmount = SCROLL_SPEED;
      }

      if (scrollAmount !== 0) {
        container.scrollTop += scrollAmount;
        scrollRef.current = requestAnimationFrame(scrollIfNeeded);
      } else {
        scrollRef.current = null;
      }
    };

    if (!scrollRef.current) {
      scrollRef.current = requestAnimationFrame(scrollIfNeeded);
    }

    return () => {
      if (scrollRef.current) {
        cancelAnimationFrame(scrollRef.current);
        scrollRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mousePosition]);
};
