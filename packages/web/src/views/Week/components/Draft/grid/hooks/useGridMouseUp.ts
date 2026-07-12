import { useCallback } from "react";
import { Categories_Event } from "@core/types/event.types";
import { getElemById } from "@web/common/utils/grid/grid.util";
import {
  selectDraftStatus,
  useDraftStore,
} from "@web/events/stores/draft.store";
import { useEventListener } from "@web/views/Week/hooks/mouse/useEventListener";
import { useDraftContext } from "../../context/useDraftContext";

export const useGridMouseUp = () => {
  const { actions, state } = useDraftContext();
  const { draft, dragStatus, isDragging, isResizing, resizeStatus } = state;
  const { discard, openForm, stopDragging, stopResizing, submit } = actions;

  const draftStatus = useDraftStore(selectDraftStatus);
  const draftType = draftStatus?.eventType;
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

  const handleAllDayRowMouseUp = useCallback(() => {
    if (!draft) return;

    stopMotion();

    const { shouldSubmit, shouldOpenForm } = getNextAction(
      Categories_Event.ALLDAY,
    );

    if (shouldOpenForm) {
      openForm();
      return;
    }

    if (shouldSubmit) {
      submit(draft);
    }
  }, [draft, getNextAction, stopMotion, openForm, submit]);

  const handleMainGridMouseUp = useCallback(() => {
    if (!draft || !isDrafting) return;

    if (isDrafting && draftType === Categories_Event.ALLDAY) {
      discard();
      return;
    }

    if (isDrafting && draftType === Categories_Event.SOMEDAY_WEEK) {
      discard();
      return;
    }

    stopMotion();

    const { shouldSubmit, shouldOpenForm } = getNextAction(
      Categories_Event.TIMED,
    );

    if (shouldOpenForm) {
      openForm();
      return;
    }

    if (shouldSubmit) {
      submit(draft);
    }
  }, [
    draft,
    isDrafting,
    draftType,
    getNextAction,
    discard,
    stopMotion,
    openForm,
    submit,
  ]);

  const onGridMouseUp = useCallback(
    (e: MouseEvent) => {
      if (!draft || !isDrafting) return;
      if (e.button !== 0) return;

      // Only for SOMEDAY_WEEK in main grid, we need to stop propagation
      if (
        isDrafting &&
        draftType === Categories_Event.SOMEDAY_WEEK &&
        draft?.values.schedule.kind !== "allDay"
      ) {
        e.stopPropagation();
      }

      if (draft?.values.schedule.kind === "allDay") {
        handleAllDayRowMouseUp();
      } else {
        handleMainGridMouseUp();
      }
    },
    [
      draft,
      isDrafting,
      draftType,
      handleAllDayRowMouseUp,
      handleMainGridMouseUp,
    ],
  );

  useEventListener("mouseup", onGridMouseUp, getElemById("root"));
};
