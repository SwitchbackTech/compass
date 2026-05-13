import { useCallback, useEffect } from "react";
import { selectIsDrafting } from "@web/ducks/events/selectors/draft.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { useEventListener } from "@web/views/Week/hooks/mouse/useEventListener";
import { useDraftContext } from "../../context/useDraftContext";

export const useGridMouseMove = () => {
  const { actions, interaction, state } = useDraftContext();
  const { isResizing } = state;
  const { drag, resize } = actions;

  const isDrafting = useAppSelector(selectIsDrafting);

  const _onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDrafting) return;

      if (isResizing) {
        resize(e);
      } else if (interaction.getSnapshot().mode === "drag") {
        e.preventDefault();
        document.body.style.cursor = "move";
        drag(e);
      }
    },
    [drag, interaction, isDrafting, isResizing, resize],
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
