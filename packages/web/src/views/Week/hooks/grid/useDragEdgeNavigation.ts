import { type MutableRefObject, useEffect, useRef } from "react";
import { useSidebarContext } from "@web/components/PlannerSidebar/draft/context/useSidebarContext";
import { selectIsDNDing } from "@web/ducks/events/selectors/draft.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { useDraftContext } from "@web/views/Week/components/Draft/context/useDraftContext";
import {
  createWeekEdgeNavigationController,
  WEEK_EDGE_NAVIGATION_THRESHOLD_PX,
  type WeekEdgeNavigationPoint,
} from "@web/views/Week/interaction/adapter/weekEdgeNavigation";
import {
  resetWeekInteractionEdgeNavigationState,
  setWeekInteractionEdgeNavigationState,
} from "@web/views/Week/interaction/state/weekInteractionEdgeNavigationState";
import { type WeekProps } from "../useWeek";

export const useDragEdgeNavigation = (
  mainGridRef: MutableRefObject<HTMLDivElement | null>,
  weekProps: WeekProps,
) => {
  const { state: draftState } = useDraftContext();
  const isDNDing = useAppSelector(selectIsDNDing);
  const { state: sidebarState } = useSidebarContext();
  const isGridEventDragging = draftState.isDragging;
  const isSomedayEventDragging = isDNDing;
  const gridEventDraft = draftState.draft;
  const somedayEventDraft = sidebarState.draft;
  const isDragging = isGridEventDragging || isSomedayEventDragging;
  const currentDraft = gridEventDraft || somedayEventDraft;
  const hasCurrentDraft = Boolean(currentDraft);
  const controllerRef = useRef(createWeekEdgeNavigationController());
  const currentDraftRef = useRef(currentDraft);
  const frameRef = useRef<number | null>(null);
  const isDraggingRef = useRef(isDragging);
  const pointerRef = useRef<WeekEdgeNavigationPoint | null>(null);
  const weekUtilRef = useRef(weekProps.util);

  currentDraftRef.current = currentDraft;
  isDraggingRef.current = isDragging;
  weekUtilRef.current = weekProps.util;

  useEffect(() => {
    const resetDraftEdgeNavigation = () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }

      pointerRef.current = null;
      controllerRef.current.reset();
      resetWeekInteractionEdgeNavigationState();
    };

    const scheduleFrame = () => {
      if (frameRef.current !== null) {
        return;
      }

      frameRef.current = requestAnimationFrame(runFrame);
    };

    const runFrame = (timestamp: number) => {
      frameRef.current = null;

      if (
        !isDraggingRef.current ||
        !currentDraftRef.current ||
        !mainGridRef.current ||
        !pointerRef.current
      ) {
        resetDraftEdgeNavigation();
        return;
      }

      const rect = mainGridRef.current.getBoundingClientRect();
      const update = controllerRef.current.update({
        bounds: {
          bottom: rect.bottom,
          edgeThresholdPx: WEEK_EDGE_NAVIGATION_THRESHOLD_PX,
          left: rect.left,
          right: rect.right,
          top: rect.top,
        },
        pointer: pointerRef.current,
        timestamp,
      });

      setWeekInteractionEdgeNavigationState(update.state);

      if (update.requestedSide === "prev") {
        weekUtilRef.current.decrementWeek("drag-to-edge");
      } else if (update.requestedSide === "next") {
        weekUtilRef.current.incrementWeek("drag-to-edge");
      }

      if (update.isDwellActive) {
        scheduleFrame();
      }
    };

    if (!isDragging || !hasCurrentDraft) {
      resetDraftEdgeNavigation();
      return;
    }

    const updatePointer = (event: MouseEvent) => {
      pointerRef.current = { x: event.clientX, y: event.clientY };
      scheduleFrame();
    };

    window.addEventListener("mousemove", updatePointer);
    scheduleFrame();

    return () => {
      window.removeEventListener("mousemove", updatePointer);
      resetDraftEdgeNavigation();
    };
  }, [hasCurrentDraft, isDragging, mainGridRef]);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }

      pointerRef.current = null;
      controllerRef.current.reset();
      resetWeekInteractionEdgeNavigationState();
    };
  }, []);
};
