import { useDraftContext } from "./useDraftContext";

/**
 * Narrow Week draft reads for mid-drag grid helpers (edge navigation and
 * smart scroll). Prefer this over `useDraftContext` when actions/setters
 * and the full local draft are not needed.
 */
export const useDraftDragMotion = () => {
  const { state } = useDraftContext();

  return {
    hasDraft: state.draft !== null,
    isDragging: state.isDragging,
    isTimedDraft: state.draft?.values.schedule.kind === "timed",
  };
};
