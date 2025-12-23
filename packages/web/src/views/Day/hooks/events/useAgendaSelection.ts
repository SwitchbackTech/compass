import { ObjectId } from "bson";
import { useCallback, useRef, useState } from "react";
import { Origin, Priorities } from "@core/constants/core.constants";
import { Schema_Event, WithCompassId } from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import { getUserId } from "@web/auth/auth.util";
import {
  CursorItem,
  openFloatingAtCursor,
} from "@web/common/hooks/useOpenAtCursor";
import { getCalendarEventElementFromGrid } from "@web/common/utils/event/event.util";
import { setDraft } from "@web/store/events";
import { useDateInView } from "@web/views/Day/hooks/navigation/useDateInView";
import { getEventTimeFromPosition } from "@web/views/Day/util/agenda/agenda.util";

const YMD = dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT;

interface SelectionState {
  isSelecting: boolean;
  startY: number;
  currentY: number;
  draftId: string | null;
}

export function useAgendaSelection() {
  const dateInView = useDateInView();
  const [selection, setSelection] = useState<SelectionState>({
    isSelecting: false,
    startY: 0,
    currentY: 0,
    draftId: null,
  });
  const clickCount = useRef(0);
  const clickTimer = useRef<NodeJS.Timeout | null>(null);
  const selectionRef = useRef<SelectionState>(selection);

  // Keep ref in sync with state
  selectionRef.current = selection;

  const handlePointerDown = useCallback(
    async (e: React.PointerEvent<HTMLElement>) => {
      // Track clicks for double-click detection
      // Using a 300ms window which is standard for double-click timing
      clickCount.current += 1;

      if (clickTimer.current) {
        clearTimeout(clickTimer.current);
      }

      if (clickCount.current === 2) {
        // Double-click detected - start selection
        clickCount.current = 0;
        e.preventDefault();
        e.stopPropagation();

        const user = await getUserId();
        if (!user) return;

        const draftId = new ObjectId().toString();
        const startY = e.clientY;

        // Create initial draft event
        const startTime = getEventTimeFromPosition(startY, dateInView);
        const endTime = startTime.add(15, "minutes");

        const draftEvent: WithCompassId<Schema_Event> = {
          _id: draftId,
          title: "",
          description: "",
          startDate: startTime.format(),
          endDate: endTime.format(),
          isAllDay: false,
          isSomeday: false,
          user,
          priority: Priorities.UNASSIGNED,
          origin: Origin.COMPASS,
        };

        setDraft(draftEvent);

        setSelection({
          isSelecting: true,
          startY,
          currentY: startY,
          draftId,
        });

        // Capture pointer to continue receiving events even if cursor moves outside element
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      } else {
        // Single click - reset after delay
        clickTimer.current = setTimeout(() => {
          clickCount.current = 0;
        }, 300);
      }
    },
    [dateInView],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!selectionRef.current.isSelecting) return;

      e.preventDefault();
      const currentY = e.clientY;

      setSelection((prev) => ({
        ...prev,
        currentY,
      }));

      // Update draft event with new end time
      if (selectionRef.current.draftId) {
        const { startY } = selectionRef.current;
        const minY = Math.min(startY, currentY);
        const maxY = Math.max(startY, currentY);

        const startTime = getEventTimeFromPosition(minY, dateInView);
        const endTime = getEventTimeFromPosition(maxY, dateInView);

        setDraft((prev) =>
          prev
            ? {
                ...prev,
                startDate: startTime.format(),
                endDate: endTime.format(),
              }
            : prev,
        );
      }
    },
    [dateInView],
  );

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (!selectionRef.current.isSelecting) return;

    e.preventDefault();
    e.stopPropagation();

    const { draftId } = selectionRef.current;

    setSelection({
      isSelecting: false,
      startY: 0,
      currentY: 0,
      draftId: null,
    });

    // Release pointer capture
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    // Open event form with a slight delay to ensure DOM is ready
    if (draftId) {
      // Using requestAnimationFrame + queueMicrotask for more reliable timing
      requestAnimationFrame(() => {
        queueMicrotask(() => {
          const reference = getCalendarEventElementFromGrid(draftId);
          if (reference) {
            openFloatingAtCursor({ reference, nodeId: CursorItem.EventForm });
          }
        });
      });
    }
  }, []);

  return {
    selection,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
    },
  };
}
