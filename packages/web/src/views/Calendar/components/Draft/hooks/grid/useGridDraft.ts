import { useGridClick } from "./useGridClick";
import { useGridMouseMove } from "./useGridMouseMove";

export const useGridDraft = () => {
  useGridClick();
  useGridMouseMove();

  return {
    draftState,
    draftUtil,
  };
};

export type GridDraftProps = ReturnType<typeof useGridDraft>;
