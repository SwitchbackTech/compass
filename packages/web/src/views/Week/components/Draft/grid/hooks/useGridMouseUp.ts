import { useCallback } from "react";
import { Categories_Event } from "@web/common/types/web.event.types";
import { getElemById } from "@web/common/utils/grid/grid.util";
import {
  draftActions,
  selectDraftStatus,
  useDraftStore,
} from "@web/events/stores/draft.store";
import { useEventListener } from "@web/views/Week/hooks/mouse/useEventListener";
import { useDraftContext } from "../../context/useDraftContext";

export const useGridMouseUp = () => {
  const { actions, state } = useDraftContext();
  const { draft, dragStatus, isDragging, isResizing, resizeStatus } = state;
  const { stopDragging, stopResizing, submit } = actions;

  const draftStatus = useDraftStore(selectDraftStatus);
  const isDrafting = draftStatus?.isDrafting;

  const getNextAction = useCallback(
    (category: Categories_Event) => {
      let shouldSubmit = false;
      let hasMoved = false;
      const isNew = draft?.kind !== "edit";

      if (category === Categories_Event.TIMED) {
        hasMoved = resizeStatus?.hasMoved || dragStatus?.hasMoved || false;
        shouldSubmit = true;
      } else if (category === Categories_Event.ALLDAY) {
        hasMoved = dragStatus?.hasMoved || resizeStatus?.hasMoved || false;
        shouldSubmit = hasMoved;
      }

      const clickedOnExisting = !isNew && !hasMoved;
      const shouldOpenForm = isNew || clickedOnExisting;

      return { shouldOpenForm, shouldSubmit };
    },
    [draft?.kind, dragStatus?.hasMoved, resizeStatus?.hasMoved],
  );

  const stopMotion = useCallback(() => {
    if (isResizing) {
      stopResizing();
    }

    if (isDragging) {
      stopDragging();
    }
  }, [isDragging, isResizing, stopDragging, stopResizing]);

  const commitOnMouseUp = useCallback(
    (category: Categories_Event) => {
      if (!draft) return;

      stopMotion();

      const { shouldSubmit, shouldOpenForm } = getNextAction(category);

      if (shouldOpenForm) {
        draftActions.setFormOpen(true);
        return;
      }

      if (shouldSubmit) {
        submit(draft);
      }
    },
    [draft, getNextAction, stopMotion, submit],
  );

  const onGridMouseUp = useCallback(
    (e: MouseEvent) => {
      if (!draft || !isDrafting) return;
      if (e.button !== 0) return;

      // Commit against the live draft schedule so an all-day → timed conversion
      // mid-drag lands in the timed path (store eventType may lag one frame).
      commitOnMouseUp(
        draft.values.schedule.kind === "allDay"
          ? Categories_Event.ALLDAY
          : Categories_Event.TIMED,
      );
    },
    [draft, isDrafting, commitOnMouseUp],
  );

  useEventListener("mouseup", onGridMouseUp, getElemById("root"));
};
