import { useCallback } from "react";
import { Categories_Event } from "@core/types/event.types";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { getElemById } from "@web/common/utils/grid/grid.util";
import { selectDraftStatus } from "@web/ducks/events/selectors/draft.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { useEventListener } from "@web/views/Week/hooks/mouse/useEventListener";
import { useDraftContext } from "../../context/useDraftContext";

export const useGridMouseUp = () => {
  const { actions, interaction, state } = useDraftContext();
  const { draft, dragStatus, isDragging, isResizing, resizeStatus } = state;
  const { discard, openForm, stopDragging, stopResizing, submit } = actions;

  const draftStatus = useAppSelector(selectDraftStatus);
  const reduxDraftType = draftStatus?.eventType;
  const isDrafting = draftStatus?.isDrafting;

  const getNextAction = useCallback(
    (category: Categories_Event, currentDraft: Schema_GridEvent) => {
      let shouldSubmit = false;
      let hasMoved = false;
      const isNew = !currentDraft?._id;

      if (category === Categories_Event.TIMED) {
        hasMoved = resizeStatus?.hasMoved || dragStatus?.hasMoved || false;
        shouldSubmit = !currentDraft?.isOpen;
      } else if (category === Categories_Event.ALLDAY) {
        hasMoved = dragStatus?.hasMoved || resizeStatus?.hasMoved || false;
        shouldSubmit = hasMoved;
      }

      const clickedOnExisting = !isNew && !hasMoved;
      const shouldOpenForm =
        (isNew || clickedOnExisting) && !currentDraft?.isOpen;

      return { shouldOpenForm, shouldSubmit };
    },
    [dragStatus?.hasMoved, resizeStatus?.hasMoved],
  );

  const getLatestDraft = useCallback(() => {
    return interaction.getSnapshot().draft ?? draft;
  }, [draft, interaction]);

  const handleAllDayRowMouseUp = useCallback(() => {
    const latestDraft = getLatestDraft();
    if (!latestDraft) return;

    if (isResizing) {
      stopResizing();
    }

    if (isDragging) {
      stopDragging();
    }

    const { shouldSubmit, shouldOpenForm } = getNextAction(
      Categories_Event.ALLDAY,
      latestDraft,
    );

    if (shouldOpenForm) {
      openForm();
      return;
    }

    if (shouldSubmit) {
      submit(latestDraft);
    }
  }, [
    getLatestDraft,
    isDragging,
    isResizing,
    getNextAction,
    stopDragging,
    stopResizing,
    openForm,
    submit,
  ]);

  const handleMainGridMouseUp = useCallback(() => {
    const latestDraft = getLatestDraft();
    if (!latestDraft || !isDrafting) return;

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
      latestDraft,
    );

    if (shouldOpenForm) {
      openForm();
      return;
    }

    if (shouldSubmit) {
      submit(latestDraft);
    }
  }, [
    getLatestDraft,
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
      const latestDraft = getLatestDraft();
      if (!latestDraft || !isDrafting) return;
      if (e.button !== 0) return;

      // Only for SOMEDAY_WEEK in main grid, we need to stop propagation
      if (
        isDrafting &&
        reduxDraftType === Categories_Event.SOMEDAY_WEEK &&
        !latestDraft?.isAllDay
      ) {
        e.stopPropagation();
      }

      if (latestDraft?.isAllDay) {
        handleAllDayRowMouseUp();
      } else {
        handleMainGridMouseUp();
      }
    },
    [
      getLatestDraft,
      isDrafting,
      reduxDraftType,
      handleAllDayRowMouseUp,
      handleMainGridMouseUp,
    ],
  );

  useEventListener("mouseup", onGridMouseUp, getElemById("root"));
};
