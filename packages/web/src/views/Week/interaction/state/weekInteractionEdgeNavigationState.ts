import { useSyncExternalStore } from "react";

export interface WeekInteractionEdgeNavigationState {
  currentEdge: "left" | "right" | null;
  isDragging: boolean;
  isTimerActive: boolean;
  progress: number;
}

const idleState: WeekInteractionEdgeNavigationState = {
  currentEdge: null,
  isDragging: false,
  isTimerActive: false,
  progress: 0,
};

let state = idleState;
const listeners = new Set<() => void>();

export const getWeekInteractionEdgeNavigationState = () => state;

export const setWeekInteractionEdgeNavigationState = (
  nextState: WeekInteractionEdgeNavigationState,
) => {
  if (
    state.currentEdge === nextState.currentEdge &&
    state.isDragging === nextState.isDragging &&
    state.isTimerActive === nextState.isTimerActive &&
    state.progress === nextState.progress
  ) {
    return;
  }

  state = nextState;

  for (const listener of listeners) {
    listener();
  }
};

export const resetWeekInteractionEdgeNavigationState = () => {
  setWeekInteractionEdgeNavigationState(idleState);
};

export const useWeekInteractionEdgeNavigationState = () =>
  useSyncExternalStore(
    subscribeToWeekInteractionEdgeNavigationState,
    getWeekInteractionEdgeNavigationState,
    getWeekInteractionEdgeNavigationState,
  );

const subscribeToWeekInteractionEdgeNavigationState = (
  listener: () => void,
) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};
