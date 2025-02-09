import { MouseEvent, useCallback, useState } from "react";
import { Categories_Event } from "@core/types/event.types";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import {
  assembleTimedDraft,
  isOverMainGrid,
} from "@web/common/utils/draft/draft.util";
import { ID_GRID_ROW } from "@web/common/constants/web.constants";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { selectIsSidebarOpen } from "@web/ducks/events/selectors/view.selectors";
import { DateCalcs } from "../grid/useDateCalcs";
import { useEventListener } from "../mouse/useEventListener";
import { WeekProps } from "../useWeek";
import { Measurements_Grid } from "../grid/useGridLayout";
import { State_GridDraft, Util_GridDraft } from "./useDraftUtil";

export const useMouseHandlers = (
  draftState: State_GridDraft,
  draftUtil: Util_GridDraft,
  dateCalcs: DateCalcs,
  measurements: Measurements_Grid,
  startOfView: WeekProps["component"]["startOfView"]
) => {
  const dispatch = useAppDispatch();

  const { draft, isDrafting, isDragging, isResizing } = draftState;
  const { drag, resize } = draftUtil;
  const isSidebarOpen = useAppSelector(selectIsSidebarOpen);
  const [isMouseDown, setIsMouseDown] = useState(false);

  //TODO remove if not needed for dnd
  // const mousePosition = useMousePosition(
  //   isDragging,
  //   draftState.isFormOpen,
  //   measurements
  // );

  const startTimedDraft = async (e: MouseEvent) => {
    const event = await assembleTimedDraft(
      e,
      dateCalcs,
      isSidebarOpen,
      startOfView
    );
    dispatch(
      draftSlice.actions.startResizing({ event, dateToChange: "endDate" })
    );
  };

  const onClick = async (e: MouseEvent) => {
    const clickedEmptyRow = (e.target as HTMLElement).id.includes(ID_GRID_ROW);
    if (!clickedEmptyRow) return;

    if (isDrafting) {
      dispatch(draftSlice.actions.discard());
      return;
    }

    const event = await assembleTimedDraft(
      e,
      dateCalcs,
      isSidebarOpen,
      startOfView
    );
    dispatch(
      draftSlice.actions.start({
        activity: "gridClick",
        eventType: Categories_Event.TIMED,
        event,
      })
    );
  };

  const onMouseDown = useCallback((e: MouseEvent) => {
    setIsMouseDown(true);
  }, []);

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      //TODO handle when dragging over grid
      // TODO handle when dropping
      if (!isDrafting && isMouseDown) {
        const shouldStartDraft = isOverMainGrid(
          e.clientX,
          e.clientY,
          measurements.allDayRow
        );
        if (shouldStartDraft) {
          startTimedDraft(e); //TODO return here?
        }
      }

      if (!isDrafting) return;

      if (isResizing && !draft?.isAllDay) {
        resize(e);
      } else if (isDragging) {
        e.preventDefault();
        drag(e);
      }
    },
    [
      draft?.isAllDay,
      drag,
      isDrafting,
      isDragging,
      isMouseDown,
      isResizing,
      // mousePosition, //TODO remove if not needed for dragging
      resize,
    ]
  );

  const onMouseUp = useCallback((e: MouseEvent) => {
    setIsMouseDown(false);
  }, []);

  useEventListener("mousedown", onMouseDown);
  useEventListener("mousemove", onMouseMove);
  useEventListener("mouseup", onMouseUp);
  useEventListener("click", onClick);
};
