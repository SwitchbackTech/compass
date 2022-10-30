import React, { FC, MouseEvent } from "react";
import { useDrop } from "react-dnd";
import mergeRefs from "react-merge-refs";
import { Dayjs } from "dayjs";
import { Ref_Callback } from "@web/common/types/util.types";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { Categories_Event, Schema_Event } from "@core/types/event.types";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { Ref_Grid } from "@web/views/Calendar/components/Grid/grid.types";
import { ID_GRID_MAIN } from "@web/common/constants/web.constants";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { getDefaultEvent } from "@web/common/utils/event.util";
import { getX } from "@web/common/utils/grid.util";
import { useDispatch, useSelector } from "react-redux";
import {
  draftSlice,
  getFutureEventsSlice,
} from "@web/ducks/events/event.slice";
import { DragItem, DropResult } from "@web/common/types/dnd.types";
import {
  DRAFT_DURATION_MIN,
  SIDEBAR_OPEN_WIDTH,
} from "@web/views/Calendar/layout.constants";
import {
  selectDraftId,
  selectDraftStatus,
} from "@web/ducks/events/event.selectors";
import { Status_DraftEvent } from "@web/common/types/web.event.types";

import { Columns } from "../Columns";
import { GridRows } from "./GridRows";
import { StyledMainGrid } from "./styled";
import { MainGridEvents } from "./MainGridEvents";

interface Props {
  dateCalcs: DateCalcs;
  isSidebarOpen: boolean;
  mainGridRef: Ref_Callback;
  measurements: Measurements_Grid;
  today: Dayjs;
  scrollRef: Ref_Grid;
  weekProps: WeekProps;
}

export const MainGrid: FC<Props> = ({
  dateCalcs,
  isSidebarOpen,
  mainGridRef,
  measurements,
  today,
  scrollRef,
  weekProps,
}) => {
  const dispatch = useDispatch();

  const { component } = weekProps;
  const { isCurrentWeek, startOfSelectedWeekDay, week, weekDays } = component;
  const { isDrafting } = useSelector(selectDraftId);
  const { eventType: draftType } = useSelector(
    selectDraftStatus
  ) as Status_DraftEvent;

  const convertSomedayToTimed = (_id: string, x: number, y: number) => {
    const _start = dateCalcs.getDateByXY(
      x - SIDEBAR_OPEN_WIDTH,
      y,
      startOfSelectedWeekDay
    );
    const startDate = _start.format();
    const endDate = _start.add(1, "hour").format();

    const updatedFields: Schema_Event = {
      isAllDay: false,
      isSomeday: false,
      isTimesShown: true,
      startDate,
      endDate,
    };

    dispatch(
      getFutureEventsSlice.actions.convert({
        _id,
        updatedFields,
      })
    );
  };

  const onMouseDown = (e: MouseEvent) => {
    const isSomedayDraftOpen =
      isDrafting && draftType === Categories_Event.SOMEDAY;
    const isDraftingAllday =
      isDrafting && draftType === Categories_Event.ALLDAY;

    if (isSomedayDraftOpen || isDraftingAllday) {
      console.log("not starting grid draft cuz: already drafting ...");
      // e.stopPropagation();
      e.stopPropagation();
      dispatch(draftSlice.actions.discard());
      return;
    }

    startTimedDraft(e);
  };

  const startTimedDraft = (e: MouseEvent) => {
    const x = getX(e, isSidebarOpen);
    const _start = dateCalcs.getDateByXY(
      x,
      e.clientY,
      component.startOfSelectedWeekDay
    );
    const startDate = _start.format();
    const endDate = _start.add(DRAFT_DURATION_MIN, "minutes").format();

    const event = getDefaultEvent(Categories_Event.TIMED, startDate, endDate);
    dispatch(
      draftSlice.actions.startResizing({ event, dateToChange: "endDate" })
    );
  };

  const [{ canDrop, isOver }, drop] = useDrop(
    () => ({
      accept: DragItem.EVENT_SOMEDAY,
      drop: (item: DropResult, monitor) => {
        const { x, y } = monitor.getClientOffset();
        convertSomedayToTimed(item._id, x, y);
      },
      collect: (monitor) => ({
        canDrop: monitor.canDrop(),
        isOver: monitor.isOver(),
      }),
    }),
    [startOfSelectedWeekDay]
  );

  return (
    <StyledMainGrid
      id={ID_GRID_MAIN}
      onMouseDown={onMouseDown}
      ref={mergeRefs([drop, mainGridRef, scrollRef])}
    >
      <Columns
        isCurrentWeek={isCurrentWeek}
        today={today}
        week={week}
        weekDays={weekDays}
      />

      <GridRows />

      <MainGridEvents measurements={measurements} weekProps={weekProps} />
    </StyledMainGrid>
  );
};
