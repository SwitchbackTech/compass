import { MouseEvent, useCallback, useState } from "react";
import { Categories_Event } from "@core/types/event.types";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import {
  assembleAlldayDraft,
  assembleTimedDraft,
  isOverMainGrid,
} from "@web/common/utils/draft/draft.util";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { selectIsSidebarOpen } from "@web/ducks/events/selectors/view.selectors";
import {
  selectDraftLocation,
  selectIsDrafting,
  selectIsDragging,
  selectIsResizing,
} from "@web/ducks/events/selectors/draft.selectors";
import { DateCalcs } from "../grid/useDateCalcs";
import { useEventListener } from "./useEventListener";
import { WeekProps } from "../useWeek";
import { Measurements_Grid } from "../grid/useGridLayout";
import { State_Draft, Util_Draft } from "../draft/grid/useDraft";
import { getClickTarget } from "./mouse.util";
import { Location_Draft } from "@web/common/types/web.event.types";

export const useMouseHandlers = (
  draftState: State_Draft,
  draftUtil: Util_Draft,
  dateCalcs: DateCalcs,
  measurements: Measurements_Grid,
  startOfView: WeekProps["component"]["startOfView"]
) => {
  const dispatch = useAppDispatch();

  const isDrafting = useAppSelector(selectIsDrafting);
  const isResizing = useAppSelector(selectIsResizing);
  const isDraggingRedux = useAppSelector(selectIsDragging);
  const draftLocation = useAppSelector(selectDraftLocation);

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

  const startAlldayDraft = async (e: MouseEvent) => {
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

  const startTimedDraft = async (e: MouseEvent) => {
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

  const handleAlldayRowClick = async (e: MouseEvent) => {
    if (isDrafting) {
      //need to discard if drafting + dragging but not the current draft
      if (!isDraggingRedux) {
        dispatch(draftSlice.actions.discard({}));
        return;
      }
    } else {
      await startAlldayDraft(e);
    }
  };

  const handleMainGridClick = async (e: MouseEvent) => {
    if (isDrafting) {
      if (!isResizing) {
        console.log("resetting ");
        dispatch(draftSlice.actions.discard({}));
        return;
      }
    } else {
      await startTimedDraft(e);
    }
  };

  const onClick = async (e: MouseEvent) => {
    const location = getClickTarget(
      (e.target as HTMLElement).id,
      draftLocation
    );
    switch (location) {
      case Location_Draft.ALLDAY_ROW:
        await handleAlldayRowClick(e);
        break;
      case Location_Draft.ALLDAY_EVENT:
        console.log("clicked allday event, opening  draft (TODO)");
        break;
      case Location_Draft.MAIN_GRID:
        handleMainGridClick(e);
        break;
      case Location_Draft.MAIN_GRID_EVENT:
        console.log("clicked event, doing nothing");
        break;
      default:
        console.log("clicked irrelvant spot, not doing anything");
      // console.log("discarding cuz clicked:", location);
      // dispatch(draftSlice.actions.discard({}));
    }
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
