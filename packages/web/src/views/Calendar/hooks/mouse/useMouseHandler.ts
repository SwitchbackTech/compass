import { useCallback, MouseEvent, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Categories_Event } from "@core/types/event.types";
import { Status_DraftEvent } from "@web/common/types/web.event.types";
import { getElemById } from "@web/common/utils/grid.util";
import { selectDraftStatus } from "@web/ducks/events/event.selectors";
import { draftSlice } from "@web/ducks/events/event.slice";
import { ID_GRID_MAIN, ID_MAIN } from "@web/common/constants/web.constants";

import { useEventListener } from "./useEventListener";

export const useMouseHandler = () => {
  const dispatch = useDispatch();

  const {
    activity,
    eventType: reduxDraftType,
    isDrafting,
  } = useSelector(selectDraftStatus) as Status_DraftEvent;
  const mainGrid = getElemById(ID_GRID_MAIN);

  const mainGridDown = useCallback(
    (e: MouseEvent) => {
      if (isDrafting && reduxDraftType === Categories_Event.SOMEDAY) {
        console.log("trying to close");
        // e.stopPropagation();

        dispatch(draftSlice.actions.discard());
        return;
      }
    },
    [dispatch, isDrafting, reduxDraftType]
  );

  const mainGridUp = useCallback(
    (e: MouseEvent) => {
      if (!isDrafting) {
        console.log("skipping");
        return;
      }
      const isNew = !draft._id;
      const hasMoved = resizeStatus?.hasMoved || dragStatus?.hasMoved;
      const clickedOnExisting = !isNew && !hasMoved;
      const shouldOpenForm = (isNew || clickedOnExisting) && !draft.isOpen;
      const shouldSubmit = !draft.isOpen;

      if (isResizing) {
        console.log("stopping resize");
        stopResizing();
      }
      if (isDragging) {
        console.log("stopping drag");
        stopDragging();
      }

      if (shouldOpenForm) {
        console.log("opening form...");
        setDraft((_draft) => {
          return { ..._draft, isOpen: true };
        });
        return;
      }
    },
    [dispatch, isDrafting, reduxDraftType]
  );

  useEventListener("mousedown", mainGridDown, mainGrid);
  useEventListener("mouseup", mainGridUp, mainGrid);
};
