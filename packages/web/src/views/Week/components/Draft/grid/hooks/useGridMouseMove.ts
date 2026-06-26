import { useCallback } from "react";
import { selectIsDrafting } from "@web/ducks/events/selectors/draft.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { useEventListener } from "@web/views/Week/hooks/mouse/useEventListener";
import { useDraftContext } from "../../context/useDraftContext";

export const useGridMouseMove = () => {
  const { actions, state } = useDraftContext();
  const { isDragging, isResizing } = state;
  const { drag, resize } = actions;

  const isDrafting = useAppSelector(selectIsDrafting);

  const _onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDrafting) return;

      if (isResizing) {
        resize(e);
      } else if (isDragging) {
        e.preventDefault();
        drag(e);
      }
    },
    [drag, isDrafting, isDragging, isResizing, resize],
  );

  useEventListener("mousemove", _onMouseMove);
};
