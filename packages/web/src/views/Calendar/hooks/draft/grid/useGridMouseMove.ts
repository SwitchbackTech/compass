import { MouseEvent, useCallback } from "react";

import { useEventListener } from "../../mouse/useEventListener";
import { State_Draft, Util_Draft } from "../useDraft";
import { selectIsDrafting } from "@web/ducks/events/selectors/draft.selectors";
import { useAppSelector } from "@web/store/store.hooks";

export const useGridMouseMove = (
  draftState: State_Draft,
  draftUtil: Util_Draft
) => {
  const { draft, isDragging, isResizing } = draftState;

  const isDrafting = useAppSelector(selectIsDrafting);

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
