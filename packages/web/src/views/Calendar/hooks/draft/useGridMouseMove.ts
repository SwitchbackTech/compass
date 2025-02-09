import { MouseEvent, useCallback, useState } from "react";

import { State_GridDraft, Util_GridDraft } from "./useDraftUtil";
import { Categories_Event } from "@core/types/event.types";
import { assembleDefaultEvent } from "@web/common/utils/event.util";
import { getMousePosition } from "@web/common/utils/position/mouse.position";
import { getX } from "@web/common/utils/grid.util";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { selectIsSidebarOpen } from "@web/ducks/events/selectors/view.selectors";
import {
  DRAFT_DURATION_MIN,
  GRID_Y_START,
  SIDEBAR_X_START,
} from "../../layout.constants";
import { DateCalcs } from "../grid/useDateCalcs";
import { useEventListener } from "../mouse/useEventListener";
import { WeekProps } from "../useWeek";
import { Measurements_Grid } from "../grid/useGridLayout";
import { useMousePosition } from "./useMousePosition";

export const useGridMouseMove = (
  draftState: State_GridDraft,
  draftUtil: Util_GridDraft,
  dateCalcs: DateCalcs,
  measurements: Measurements_Grid,
  startOfView: WeekProps["component"]["startOfView"]
) => {
  const { draft, isDrafting, isDragging, isResizing } = draftState;
  const { drag, resize } = draftUtil;
  const isSidebarOpen = useAppSelector(selectIsSidebarOpen);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const dispatch = useAppDispatch();

  const positionProps = useMousePosition(
    isDragging,
    draftState.isFormOpen,
    measurements
  );

  const startTimedDraft = async (e: MouseEvent) => {
    const x = getX(e, isSidebarOpen);
    const _start = dateCalcs.getDateByXY(x, e.clientY, startOfView);
    const startDate = _start.format();
    const endDate = _start.add(DRAFT_DURATION_MIN, "minutes").format();

    const event = await assembleDefaultEvent(
      Categories_Event.TIMED,
      startDate,
      endDate
    );
    dispatch(
      draftSlice.actions.startResizing({ event, dateToChange: "endDate" })
    );
  };

  const onMouseDown = useCallback((e: MouseEvent) => {
    setIsMouseDown(true);
    console.log("mousedown. drafting?", isDrafting);
  }, []);

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      //TODO handle when dragging over grid
      // TODO handle when dropping
      if (isMouseDown) {
        const allDayRow = measurements.allDayRow;
        if (!allDayRow?.bottom || !allDayRow?.top) {
          throw Error("Missing measurements for all-day row");
        }

        const { isOverMainGrid } = getMousePosition(
          {
            allDayRowBottom: allDayRow.bottom,
            allDayRowTop: allDayRow.top,
            gridYStart: GRID_Y_START,
            sidebarXStart: SIDEBAR_X_START,
          },
          {
            x: e.clientX,
            y: e.clientY,
          }
        );
        if (isOverMainGrid) {
          console.log("over main grid...");
        }
        if (isDrafting) {
          console.log("moved while mouse down and draftin!!!");
        } else {
          // if (isOverMainGrid) {
          console.log("starting maingrid draft...");
          startTimedDraft(e);
          // }
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
      positionProps,
      resize,
    ]
  );

  const onMouseUp = useCallback((e: MouseEvent) => {
    if (isDrafting) {
      console.log("moused up, TODO open form");
    }
    console.log("moused up, settint to false ");
    setIsMouseDown(false);
  }, []);

  useEventListener("mousemove", onMouseMove);
  useEventListener("mousedown", onMouseDown);
  useEventListener("mouseup", onMouseUp);
};
