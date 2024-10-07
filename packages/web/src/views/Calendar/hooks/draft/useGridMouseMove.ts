import { MouseEvent, useCallback } from "react";

import { useEventListener } from "../mouse/useEventListener";
import { State_GridDraft, Util_GridDraft } from "./useDraftUtil";

export const useGridMouseMove = (
  draftState: State_GridDraft,
  draftUtil: Util_GridDraft
) => {
  const { draft, isDrafting, isDragging, isResizing } = draftState;

  const { drag, resize } = draftUtil;

  const _onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDrafting) return;

      if (isResizing && !draft?.isAllDay) {
        resize(e);
      } else if (isDragging) {
        e.preventDefault();
        drag(e);
      }
    },
    [draft?.isAllDay, drag, isDrafting, isDragging, isResizing, resize]
  );

  useEventListener("mousemove", _onMouseMove);
};
