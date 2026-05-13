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
  const { draft, isResizing } = state;
  const { discard, openForm, stopDragging, stopResizing, submit } = actions;

  const draftStatus = useAppSelector(selectDraftStatus);
  const reduxDraftType = draftStatus?.eventType;
  const isDrafting = draftStatus?.isDrafting;

  const getNextAction = useCallback(
    (
      category: Categories_Event,
      currentDraft: Schema_GridEvent,
      hasMoved: boolean,
    ) => {
      let shouldSubmit = false;
      const isNew = !currentDraft?._id;

      if (category === Categories_Event.TIMED) {
        shouldSubmit = !currentDraft?.isOpen;
      } else if (category === Categories_Event.ALLDAY) {
        shouldSubmit = hasMoved;
      }

      const clickedOnExisting = !isNew && !hasMoved;
      const shouldOpenForm =
        (isNew || clickedOnExisting) && !currentDraft?.isOpen;

      return { shouldOpenForm, shouldSubmit };
    },
    [],
  );

  const getLatestDraft = useCallback(() => {
    return interaction.getSnapshot().draft ?? draft;
  }, [draft, interaction]);

  const getHasMoved = useCallback(() => {
    const interactionState = interaction.getSnapshot();

    return interactionState.drag.hasMoved || interactionState.resize.hasMoved;
  }, [interaction]);

  const handleAllDayRowMouseUp = useCallback(() => {
    const latestDraft = getLatestDraft();
    if (!latestDraft) return;
    const hasMoved = getHasMoved();

    if (isResizing) {
      stopResizing();
    }

    if (interaction.getSnapshot().mode === "drag") {
      stopDragging();
    }

    const { shouldSubmit, shouldOpenForm } = getNextAction(
      Categories_Event.ALLDAY,
      latestDraft,
      hasMoved,
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
    getHasMoved,
    interaction,
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
    const hasMoved = getHasMoved();

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

    if (interaction.getSnapshot().mode === "drag") {
      stopDragging();
    }

    const { shouldSubmit, shouldOpenForm } = getNextAction(
      Categories_Event.TIMED,
      latestDraft,
      hasMoved,
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
    getHasMoved,
    isDrafting,
    reduxDraftType,
    isResizing,
    interaction,
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
