import { MouseEvent, useCallback, useState } from "react";
import { Categories_Event } from "@core/types/event.types";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import {
  assembleAlldayDraft,
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
import {
  selectDraftStatus,
  selectIsDrafting,
} from "@web/ducks/events/selectors/draft.selectors";

export const useMouseHandlers = (
  draftState: State_Draft,
  draftUtil: Util_Draft,
  dateCalcs: DateCalcs,
  measurements: Measurements_Grid,
  startOfView: WeekProps["component"]["startOfView"]
) => {
  const dispatch = useAppDispatch();

  const isDrafting = useAppSelector(selectIsDrafting);
  const draftStatus = useAppSelector(selectDraftStatus);
  const isResizing = draftStatus?.activity === "resizing";

  const { draft, isDragging } = draftState;
  const { drag, resize } = draftUtil;
  const isSidebarOpen = useAppSelector(selectIsSidebarOpen);
  const [isMouseDown, setIsMouseDown] = useState(false);

  //TODO remove if not needed for dnd
  // const mousePosition = useMousePosition(
  //   isDragging,
  //   draftState.isFormOpen,
  //   measurements
  // );

  const createAlldayDraft = async (e: MouseEvent) => {
    const event = await assembleAlldayDraft(
      e,
      dateCalcs,
      isSidebarOpen,
      startOfView
    );
    dispatch(
      draftSlice.actions.start({
        activity: "gridClick",
        eventType: Categories_Event.ALLDAY,
        event,
      })
    );
  };

  const createTimedDraft = async (e: MouseEvent) => {
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

  const getClickTarget = (e: MouseEvent): "alldayrow" | "maingrid" | null => {
    const target = e.target as HTMLElement;
    const id = target.id;

    if (id === ID_GRID_ALLDAY_ROW) return "alldayrow";
    if (id.includes(ID_GRID_ROW)) return "maingrid";

    return null;
  };

  const startResizingTimedDraft = async (e: MouseEvent) => {
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
    if (isDrafting) {
      if (isResizing) {
        console.log("ignoring cuz resizing");
        return;
      } else {
        dispatch(draftSlice.actions.discard({}));
        return;
      }
    }

    const location = getClickTarget(e);
    switch (location) {
      case "alldayrow":
        await createAlldayDraft(e);
        break;
      case "maingrid":
        console.log("clicked maingrid");
        await createTimedDraft(e);
        break;
      default:
        console.log(
          "not discarding OR creating new cuz you didn't click right place",
          `target id: ${e.target.id}`
        );
        return;
    }
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
          startResizingTimedDraft(e);
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
