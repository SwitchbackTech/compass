import { MouseEvent, useCallback, useState } from "react";
import { Categories_Event } from "@core/types/event.types";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import {
  assembleTimedDraft,
  isOverMainGrid,
} from "@web/common/utils/draft/draft.util";
import {
  ID_GRID_ALLDAY_ROW,
  ID_GRID_ROW,
  ID_GRID_ROW_CONTAINER,
} from "@web/common/constants/web.constants";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { selectIsSidebarOpen } from "@web/ducks/events/selectors/view.selectors";
import { DateCalcs } from "../grid/useDateCalcs";
import { useEventListener } from "./useEventListener";
import { WeekProps } from "../useWeek";
import { Measurements_Grid } from "../grid/useGridLayout";
import { State_Draft, Util_Draft } from "../draft/grid/useDraft";
import { selectIsDrafting } from "@web/ducks/events/selectors/draft.selectors";

export const useMouseHandlers = (
  draftState: State_Draft,
  draftUtil: Util_Draft,
  dateCalcs: DateCalcs,
  measurements: Measurements_Grid,
  startOfView: WeekProps["component"]["startOfView"]
) => {
  const dispatch = useAppDispatch();

  const isDrafting = useAppSelector(selectIsDrafting);

  const { draft, isDragging, isResizing } = draftState;
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
    const clickedMainGrid = (e.target as HTMLElement).id.includes(ID_GRID_ROW);
    // const didNotClickMainGridContainer =
    //   (e.target as HTMLElement).id.includes(ID_GRID_ROW_CONTAINER) === false;

    const clickedAllDayRow =
      (e.target as HTMLElement).id === ID_GRID_ALLDAY_ROW;

    if (!clickedMainGrid && !clickedAllDayRow) {
      console.log(
        "not discarding OR creating new cuz you didn't click right place",
        `target id: ${e.target.id}`,
        `clickedMainGrid: ${clickedMainGrid}`,
        `clickedAllDayRow: ${clickedAllDayRow}`
      );
      return;
    }

    // what about when clicking sidebar?
    // console.log("handling cuz you clicked empty space in grid:", e.target);

    if (isDrafting) {
      dispatch(draftSlice.actions.discard());
      return;
    }

    // if (clickedMainGrid) {
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
    // }
  };

  const onMouseDown = useCallback((e: MouseEvent) => {
    console.log("moused down");
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
