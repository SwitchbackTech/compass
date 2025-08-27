import { MutableRefObject, useEffect, useRef, useState } from "react";
import { ID_GRID_ALLDAY_ROW } from "@web/common/constants/web.constants";
import { getElemById } from "@web/common/utils/grid.util";
import { selectIsDNDing } from "@web/ducks/events/selectors/draft.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { useDraftContext } from "@web/views/Calendar/components/Draft/context/useDraftContext";
import { SidebarDraftContextValue } from "@web/views/Calendar/components/Draft/sidebar/context/SidebarDraftContext";
import { useSidebarContext } from "@web/views/Calendar/components/Draft/sidebar/context/useSidebarContext";
import { WeekProps } from "../useWeek";

const EDGE_THRESHOLD = 50; // pixels from edge to trigger navigation
const NAVIGATION_DELAY = 500; // milliseconds to hold before navigating

export const useDragEdgeNavigation = (
  mainGridRef: MutableRefObject<HTMLDivElement | null>,
  weekProps: WeekProps,
) => {
  const { state: draftState } = useDraftContext();
  const isDNDing = useAppSelector(selectIsDNDing);
  const { state: sidebarState } =
    useSidebarContext() as SidebarDraftContextValue;
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastEdgeRef = useRef<"left" | "right" | null>(null);

  const isGridEventDragging = draftState.isDragging;
  const isSomedayEventDragging = isDNDing;

  const gridEventDraft = draftState.draft;
  const somedayEventDraft = sidebarState.draft;

  const isDragging = isGridEventDragging || isSomedayEventDragging;
  const currentDraft = gridEventDraft || somedayEventDraft;

  // Track mouse position during dragging
  useEffect(() => {
    if (!isDragging) {
      // Clear any pending navigation when dragging stops
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
        navigationTimeoutRef.current = null;
      }
      lastEdgeRef.current = null;

      return;
    }

    const updateMousePosition = (event: MouseEvent) => {
      setMousePosition({ x: event.clientX, y: event.clientY });
    };

    window.addEventListener("mousemove", updateMousePosition);

    return () => {
      window.removeEventListener("mousemove", updateMousePosition);
    };
  }, [isDragging]);

  // Check for edge proximity and trigger navigation
  useEffect(() => {
    if (!isDragging || !currentDraft) {
      return;
    }

    // Use appropriate container based on event type
    const isAllDay = currentDraft.isAllDay;
    const container = isAllDay
      ? getElemById(ID_GRID_ALLDAY_ROW)
      : mainGridRef.current;

    if (!container) {
      return;
    }

    const { left, right } = container.getBoundingClientRect();
    const { x } = mousePosition;

    let currentEdge: "left" | "right" | null = null;

    // Determine which edge we're near
    if (x < left + EDGE_THRESHOLD) {
      currentEdge = "left";
    } else if (x > right - EDGE_THRESHOLD) {
      currentEdge = "right";
    }

    // If we moved away from an edge, clear the timeout
    if (currentEdge !== lastEdgeRef.current) {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
        navigationTimeoutRef.current = null;
      }
      lastEdgeRef.current = currentEdge;
    }

    // Start navigation timer if we're at an edge and don't already have a timer
    if (currentEdge && !navigationTimeoutRef.current) {
      navigationTimeoutRef.current = setTimeout(() => {
        if (currentEdge === "left") {
          weekProps.util.decrementWeek("drag-to-edge");
        } else if (currentEdge === "right") {
          weekProps.util.incrementWeek("drag-to-edge");
        }
        navigationTimeoutRef.current = null;
      }, NAVIGATION_DELAY);
    }

    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
        navigationTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, mousePosition.x, weekProps.util, currentDraft]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);
};
