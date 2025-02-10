import { MouseEvent, useCallback } from "react";
import { Categories_Event } from "@core/types/event.types";
import { getElemById } from "@web/common/utils/grid.util";
import {
  ID_GRID_ALLDAY_CONTAINER,
  ID_GRID_MAIN,
} from "@web/common/constants/web.constants";
import { selectDraftStatus } from "@web/ducks/events/selectors/draft.selectors";
import { useAppSelector } from "@web/store/store.hooks";

import { useEventListener } from "../mouse/useEventListener";
import { State_Draft, Util_Draft } from "./useDraft";

export const useGridClick = (
  draftState: State_Draft,
  draftUtil: Util_Draft
) => {
  const { draft, dragStatus, isDragging, isResizing, resizeStatus } =
    draftState;
  const draftStatus = useAppSelector(selectDraftStatus);
  const reduxDraftType = draftStatus?.eventType;
  const isDrafting = draftStatus?.isDrafting;

  const {
    discard,
    setDraft,
    setIsFormOpen,
    stopDragging,
    stopResizing,
    submit,
  } = draftUtil;

  const getNextAction = useCallback(
    (category: Categories_Event) => {
      let shouldSubmit: boolean;
      let hasMoved: boolean;
      const isNew = !draft?._id;

      if (category === Categories_Event.TIMED) {
        hasMoved = resizeStatus?.hasMoved || dragStatus?.hasMoved;
        shouldSubmit = !draft?.isOpen;
      } else if (category === Categories_Event.ALLDAY) {
        hasMoved = dragStatus?.hasMoved;
        shouldSubmit = hasMoved;
      }

      const clickedOnExisting = !isNew && !hasMoved;
      const shouldOpenForm = (isNew || clickedOnExisting) && !draft?.isOpen;

      return { shouldOpenForm, shouldSubmit };
    },
    [draft?._id, draft?.isOpen, dragStatus?.hasMoved, resizeStatus?.hasMoved]
  );

  const _onAllDayRowMouseUp = useCallback(() => {
    if (isDragging) {
      stopDragging();
    }

    if (!draft || !isDrafting) {
      return;
    }

    const { shouldSubmit, shouldOpenForm } = getNextAction(
      Categories_Event.ALLDAY
    );

    if (shouldOpenForm) {
      setIsFormOpen(true);
      return;
    }

    shouldSubmit && submit(draft);
  }, [
    isDragging,
    draft,
    isDrafting,
    getNextAction,
    submit,
    stopDragging,
    setDraft,
  ]);

  const _onMainGridMouseUp = useCallback(
    (e: MouseEvent) => {
      if (!draft || !isDrafting) {
        return;
      }

      //TODO remove
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
        Categories_Event.TIMED
      );
      if (shouldOpenForm) {
        setIsFormOpen(true);
        return;
      }

      shouldSubmit && submit(draft);
    },
    [
      discard,
      draft,
      getNextAction,
      isDrafting,
      isDragging,
      isResizing,
      reduxDraftType,
      setDraft,
      stopDragging,
      stopResizing,
      submit,
    ]
  );

  useEventListener(
    "mouseup",
    _onAllDayRowMouseUp,
    getElemById(ID_GRID_ALLDAY_CONTAINER)
  );
  const mainGrid = getElemById(ID_GRID_MAIN);
  useEventListener("mouseup", _onMainGridMouseUp, mainGrid);
};
