import { MouseEvent, useCallback, useEffect } from "react";

import { selectIsDrafting } from "@web/ducks/events/selectors/draft.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { useEventListener } from "@web/views/Calendar/hooks/mouse/useEventListener";
import { useDraftContext } from "../../context/useDraftContext";

export const useGridMouseMove = () => {
  const { actions, state } = useDraftContext();
  const { draft, isDragging, isResizing } = state;
  const { drag, resize } = actions;

  const isDrafting = useAppSelector(selectIsDrafting);

  const _onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDrafting) return;

      if (isResizing && !draft?.isAllDay) {
        resize(e);
      } else if (isDragging) {
        e.preventDefault();
        document.body.style.cursor = "move";
        drag(e);
      }
    },
    [draft?.isAllDay, drag, isDrafting, isDragging, isResizing, resize],
  );

  const _onMouseUp = useCallback(() => {
    document.body.style.cursor = "";
  }, []);

  useEventListener("mousemove", _onMouseMove);
  useEventListener("mouseup", _onMouseUp);

  // Ensure cursor resets when the component unmounts
  useEffect(() => {
    return () => {
      document.body.style.cursor = "";
    };
  }, []);
};
