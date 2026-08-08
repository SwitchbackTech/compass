import { type MutableRefObject, useEffect, useRef, useState } from "react";
import { INTERACTION_EDGE_THRESHOLD_PX } from "@web/interaction/interaction.constants";
import { useDraftDragMotion } from "@web/views/Week/components/Draft/context/useDraftDragMotion";

const SCROLL_SPEED = 10;

export const useDragEventSmartScroll = (
  mainGridRef: MutableRefObject<HTMLElement | null>,
) => {
  const { isDragging, isTimedDraft } = useDraftDragMotion();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const scrollRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isDragging) return;
    if (!isTimedDraft) return;

    const updateMousePosition = (event: MouseEvent) => {
      setMousePosition({ x: event.clientX, y: event.clientY });
    };

    window.addEventListener("mousemove", updateMousePosition);

    return () => {
      window.removeEventListener("mousemove", updateMousePosition);
    };
  }, [isDragging, isTimedDraft]);

  useEffect(() => {
    if (!mainGridRef.current) return;
    const container = mainGridRef.current;

    const scrollIfNeeded = () => {
      if (!isDragging) return;
      if (!container) return;
      if (!isTimedDraft) return;

      const containerRect = container.getBoundingClientRect();
      const { top, bottom } = {
        top: containerRect.top,
        bottom: containerRect.bottom - 100,
      };
      const { y } = mousePosition;

      let scrollAmount = 0;

      const isAtTop = container.scrollTop === 0;
      const isAtBottom =
        container.scrollTop + container.clientHeight >= container.scrollHeight;

      if (y < top + INTERACTION_EDGE_THRESHOLD_PX && !isAtTop) {
        scrollAmount = -SCROLL_SPEED;
      } else if (y > bottom - INTERACTION_EDGE_THRESHOLD_PX && !isAtBottom) {
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
  }, [
    isDragging,
    isTimedDraft,
    mousePosition.x,
    mousePosition.y,
    mousePosition,
    mainGridRef.current,
  ]);
};
