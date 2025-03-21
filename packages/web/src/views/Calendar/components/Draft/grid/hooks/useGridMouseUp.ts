import { MouseEvent, useCallback } from "react";
import { Categories_Event } from "@core/types/event.types";
import { getElemById } from "@web/common/utils/grid.util";
import { selectDraftStatus } from "@web/ducks/events/selectors/draft.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { useEventListener } from "@web/views/Calendar/hooks/mouse/useEventListener";
import { useDraftContext } from "../../context/useDraftContext";

export const useGridMouseUp = () => {
  const { actions, state } = useDraftContext();
  const { draft, dragStatus, isDragging, isResizing, resizeStatus } = state;
  const { discard, openForm, stopDragging, stopResizing, submit } = actions;

  const draftStatus = useAppSelector(selectDraftStatus);
  const reduxDraftType = draftStatus?.eventType;
  const isDrafting = draftStatus?.isDrafting;

  const getNextAction = useCallback(
    (category: Categories_Event) => {
      let shouldSubmit = false;
      let hasMoved = false;
      const isNew = !draft?._id;

      if (category === Categories_Event.TIMED) {
        hasMoved = resizeStatus?.hasMoved || dragStatus?.hasMoved || false;
        shouldSubmit = !draft?.isOpen;
      } else if (category === Categories_Event.ALLDAY) {
        hasMoved = dragStatus?.hasMoved || false;
        shouldSubmit = hasMoved;
      }

      const clickedOnExisting = !isNew && !hasMoved;
      const shouldOpenForm = (isNew || clickedOnExisting) && !draft?.isOpen;

      return { shouldOpenForm, shouldSubmit };
    },
    [draft?._id, draft?.isOpen, dragStatus?.hasMoved, resizeStatus?.hasMoved],
  );

  const handleAllDayRowMouseUp = useCallback(() => {
    if (!draft) return;

    if (isDragging) {
      stopDragging();
    }

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
  }, [draft, isDragging, getNextAction, stopDragging, openForm, submit]);

  const handleMainGridMouseUp = useCallback(() => {
    if (!draft || !isDrafting) return;

    if (isDrafting && reduxDraftType === Categories_Event.ALLDAY) {
      discard();
      return;
    }

    if (isDrafting && reduxDraftType === Categories_Event.SOMEDAY_WEEK) {
      discard();
      return;
    }

    if (isResizing) {
      stopResizing();
    }

    if (isDragging) {
      stopDragging();
    }

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
    reduxDraftType,
    isResizing,
    isDragging,
    getNextAction,
    discard,
    stopResizing,
    stopDragging,
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
        reduxDraftType === Categories_Event.SOMEDAY_WEEK &&
        !draft?.isAllDay
      ) {
        e.stopPropagation();
      }

      if (draft?.isAllDay) {
        handleAllDayRowMouseUp();
      } else {
        handleMainGridMouseUp();
      }
    },
    [
      draft,
      isDrafting,
      reduxDraftType,
      handleAllDayRowMouseUp,
      handleMainGridMouseUp,
    ],
  );

  useEventListener("mouseup", onGridMouseUp, getElemById("root"));
};
