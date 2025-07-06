import { useRef } from "react";
import { Categories_Event, Schema_Event } from "@core/types/event.types";
import { COLUMN_MONTH, COLUMN_WEEK } from "@web/common/constants/web.constants";
import { useSidebarContext } from "@web/views/Calendar/components/Draft/sidebar/context/useSidebarContext";

interface UseKeyboardDragProps {
  event: Schema_Event;
  category: Categories_Event;
  index: number;
  isDragging: boolean;
  onExitDrag: (index: number) => void;
}

export function canSendToOtherSection(
  numberOfEvents: number,
  category: Categories_Event,
  index: number,
) {
  if (category === Categories_Event.SOMEDAY_MONTH) {
    return numberOfEvents > index + 1;
  } else {
    // Someday week
    return index !== 0;
  }
}

export const useKeyboardDrag = ({
  event,
  category,
  index,
  isDragging,
  onExitDrag,
}: UseKeyboardDragProps) => {
  const sidebarContext = useSidebarContext();

  // TS Guard
  if (!sidebarContext)
    throw new Error(
      "useSidebarContext must be used within SidebarDraftProvider",
    );

  const { state } = sidebarContext;
  const column =
    state.somedayEvents.columns[
      category === Categories_Event.SOMEDAY_WEEK ? COLUMN_WEEK : COLUMN_MONTH
    ];
  const totalEvents = column.eventIds.length;

  // Keep track of current index in a ref to persist between renders
  const currentIndexRef = useRef<number>(index);
  const isDraggingRef = useRef<boolean>(isDragging);

  const updateIndex = (newIndex: number) => {
    currentIndexRef.current = newIndex;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Update the ref with the latest index prop on each keyboard event
    if (isDraggingRef.current !== isDragging) {
      isDraggingRef.current = isDragging;
      currentIndexRef.current = index;
    }

    // Track index changes based on arrow keys
    if (e.key === "ArrowUp") {
      // If we are at the beginning of the list
      if (currentIndexRef.current === 0) {
        console.log(
          "Reached beginning of list:",
          event.title,
          "current index:",
          currentIndexRef.current,
        );
        return onExitDrag(currentIndexRef.current);
      }

      const newIndex = Math.max(0, currentIndexRef.current - 1);
      updateIndex(newIndex);
    } else if (e.key === "ArrowDown") {
      // If we are at the end of the list
      if (currentIndexRef.current === totalEvents - 1) {
        console.log(
          "Reached end of list:",
          event.title,
          "current index:",
          currentIndexRef.current,
        );

        return onExitDrag(currentIndexRef.current);
      }
      const newIndex = Math.min(totalEvents - 1, currentIndexRef.current + 1);
      updateIndex(newIndex);
    }
  };

  return handleKeyDown;
};
