import { useCallback } from "react";
import {
  selectIsDrafting,
  useDraftStore,
} from "@web/events/stores/draft.store";
import { useEventListener } from "@web/views/Week/hooks/mouse/useEventListener";
import { useDraftContext } from "../../context/useDraftContext";

export const useGridMouseMove = () => {
  const { actions, state } = useDraftContext();
  const { isDragging, isResizing } = state;
  const { drag, resize } = actions;

  const isDrafting = useDraftStore(selectIsDrafting);

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
