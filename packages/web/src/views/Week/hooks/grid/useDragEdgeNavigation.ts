import { type MutableRefObject, useEffect, useRef, useState } from "react";
import { useSidebarContext } from "@web/components/PlannerSidebar/draft/context/useSidebarContext";
import { selectIsDNDing } from "@web/ducks/events/selectors/draft.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { useDraftContext } from "@web/views/Week/components/Draft/context/useDraftContext";
import { type WeekProps } from "../useWeek";

const EDGE_THRESHOLD = 50; // pixels from edge to trigger navigation
const NAVIGATION_DELAY = 500; // milliseconds to hold before navigating

export interface DragEdgeNavigationState {
  isDragging: boolean;
  currentEdge: "left" | "right" | null;
  isTimerActive: boolean;
  progress: number; // 0-100 percentage for timer progress
}

export const useDragEdgeNavigation = (
  mainGridRef: MutableRefObject<HTMLDivElement | null>,
  weekProps: WeekProps,
): DragEdgeNavigationState => {
  const { state: draftState } = useDraftContext();
  const isDNDing = useAppSelector(selectIsDNDing);
  const { state: sidebarState } = useSidebarContext();
  const [edgeState, setEdgeState] = useState<
    Pick<DragEdgeNavigationState, "currentEdge" | "isTimerActive">
  >({
    currentEdge: null,
    isTimerActive: false,
  });
  const edgeStateRef = useRef(edgeState);
  const mousePositionRef = useRef<{ x: number; y: number } | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastEdgeRef = useRef<"left" | "right" | null>(null);
  const timerStartTimeRef = useRef<number | null>(null);

  const isGridEventDragging = draftState.isDragging;
  const isSomedayEventDragging = isDNDing;

  const gridEventDraft = draftState.draft;
  const somedayEventDraft = sidebarState.draft;

  const isDragging = isGridEventDragging || isSomedayEventDragging;
  const currentDraft = gridEventDraft || somedayEventDraft;

  useEffect(() => {
    const setNextEdgeState = (
      nextState: Pick<DragEdgeNavigationState, "currentEdge" | "isTimerActive">,
    ) => {
      const previous = edgeStateRef.current;
      const isSame =
        previous.currentEdge === nextState.currentEdge &&
        previous.isTimerActive === nextState.isTimerActive;

      if (isSame) return;

      edgeStateRef.current = nextState;
      setEdgeState(nextState);
    };

    const cancelScheduledFrame = () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };

    const resetNavigation = () => {
      cancelScheduledFrame();

      lastEdgeRef.current = null;
      timerStartTimeRef.current = null;
      setNextEdgeState({ currentEdge: null, isTimerActive: false });
    };

    if (!isDragging || !currentDraft || !mainGridRef.current) {
      resetNavigation();
      return;
    }

    let isCancelled = false;

    const scheduleTick = (tick: FrameRequestCallback) => {
      if (animationFrameRef.current !== null) return;

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    const getCurrentEdge = () => {
      if (!mainGridRef.current || !mousePositionRef.current) {
        return null;
      }

      const calendarBounds = mainGridRef.current.getBoundingClientRect();
      const { x, y } = mousePositionRef.current;

      const isMouseOverCalendar =
        x >= calendarBounds.left &&
        x <= calendarBounds.right &&
        y >= calendarBounds.top &&
        y <= calendarBounds.bottom;

      if (!isMouseOverCalendar) {
        return null;
      }

      const { left, right } = calendarBounds;

      if (x < left + EDGE_THRESHOLD) {
        return "left";
      }

      if (x > right - EDGE_THRESHOLD) {
        return "right";
      }

      return null;
    };

    const updateEdge = (currentEdge: "left" | "right" | null) => {
      if (currentEdge === lastEdgeRef.current) return;

      lastEdgeRef.current = currentEdge;
      timerStartTimeRef.current = null;
      setNextEdgeState({
        currentEdge,
        isTimerActive: currentEdge !== null,
      });
    };

    const tick = (timestamp: number) => {
      animationFrameRef.current = null;

      if (isCancelled) {
        return;
      }

      const currentEdge = getCurrentEdge();
      updateEdge(currentEdge);

      if (!currentEdge) {
        cancelScheduledFrame();
        return;
      }

      if (timerStartTimeRef.current === null) {
        timerStartTimeRef.current = timestamp;
      }

      if (timerStartTimeRef.current !== null) {
        const elapsed = timestamp - timerStartTimeRef.current;

        if (elapsed >= NAVIGATION_DELAY) {
          if (currentEdge === "left") {
            weekProps.util.decrementWeek("drag-to-edge");
          } else if (currentEdge === "right") {
            weekProps.util.incrementWeek("drag-to-edge");
          }

          lastEdgeRef.current = null;
          timerStartTimeRef.current = null;
          setNextEdgeState({ currentEdge: null, isTimerActive: false });
          return;
        }
      }

      scheduleTick(tick);
    };

    const evaluatePointer = () => {
      const currentEdge = getCurrentEdge();
      updateEdge(currentEdge);

      if (currentEdge) {
        scheduleTick(tick);
      } else {
        cancelScheduledFrame();
      }
    };

    const updateMousePosition = (event: MouseEvent) => {
      mousePositionRef.current = { x: event.clientX, y: event.clientY };
      evaluatePointer();
    };

    window.addEventListener("mousemove", updateMousePosition);

    return () => {
      isCancelled = true;
      window.removeEventListener("mousemove", updateMousePosition);
      resetNavigation();
    };
  }, [currentDraft, isDragging, mainGridRef, weekProps.util]);

  return {
    isDragging,
    currentEdge: edgeState.currentEdge,
    isTimerActive: edgeState.isTimerActive,
    progress: edgeState.isTimerActive ? 100 : 0,
  };
};
