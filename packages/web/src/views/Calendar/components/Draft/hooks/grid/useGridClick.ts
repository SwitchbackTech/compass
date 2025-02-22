import { MouseEvent, useCallback } from "react";
import { Categories_Event } from "@core/types/event.types";
import {
  ID_GRID_ALLDAY_ROW,
  ID_GRID_MAIN,
} from "@web/common/constants/web.constants";
import { getElemById } from "@web/common/utils/grid.util";
import { selectDraftStatus } from "@web/ducks/events/selectors/draft.selectors";
import { useAppSelector } from "@web/store/store.hooks";
import { useEventListener } from "@web/views/Calendar/hooks/mouse/useEventListener";
import { useDraftContext } from "../../context/useDraftContext";

export const useGridClick = () => {
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

  const onAllDayRowMouseUp = useCallback(
    (e: MouseEvent) => {
      if (e.button !== 0) return;

      if (isDragging) {
        stopDragging();
      }

      if (!draft) {
        return;
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
    },
    [
      isDragging,
      draft,
      isDrafting,
      getNextAction,
      submit,
      stopDragging,
      openForm,
    ],
  );

  const onMainGridMouseUp = useCallback(
    (e: MouseEvent) => {
      if (e.button !== 0) return;

      if (!draft || !isDrafting) {
        return;
      }

      if (isDrafting && reduxDraftType === Categories_Event.ALLDAY) {
        discard();
        return;
      }

      if (isDrafting && reduxDraftType === Categories_Event.SOMEDAY_WEEK) {
        e.stopPropagation();
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
    },
    [
      discard,
      draft,
      getNextAction,
      isDrafting,
      isDragging,
      isResizing,
      openForm,
      reduxDraftType,
      stopDragging,
      stopResizing,
      submit,
    ],
  );

  useEventListener(
    "mouseup",
    onAllDayRowMouseUp,
    getElemById(ID_GRID_ALLDAY_ROW),
  );
  const mainGrid = getElemById(ID_GRID_MAIN);
  useEventListener("mouseup", onMainGridMouseUp, mainGrid);
};
