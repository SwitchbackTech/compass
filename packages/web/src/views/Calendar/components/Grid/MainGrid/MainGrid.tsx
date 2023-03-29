import React, { FC, MouseEvent } from "react";
import { useDrop } from "react-dnd";
import mergeRefs from "react-merge-refs";
import { Dayjs } from "dayjs";
import { Categories_Event } from "@core/types/event.types";
import {
  DRAFT_DURATION_MIN,
  SIDEBAR_OPEN_WIDTH,
} from "@web/views/Calendar/layout.constants";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { Ref_Callback } from "@web/common/types/util.types";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { selectDraftId } from "@web/ducks/events/event.selectors";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { Ref_Grid } from "@web/views/Calendar/components/Grid/grid.types";
import { ID_GRID_MAIN } from "@web/common/constants/web.constants";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import {
  getDefaultEvent,
  prepEvtAfterDraftDrop,
} from "@web/common/utils/event.util";
import { getX } from "@web/common/utils/grid.util";
import { createEventSlice, draftSlice } from "@web/ducks/events/event.slice";
import { Category_DragItem, DropResult } from "@web/common/types/dnd.types";

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
  const dispatch = useAppDispatch();

  const { component } = weekProps;
  const {
    isCurrentWeek,
    startOfView: startOfSelectedWeekDay,
    week,
    weekDays,
  } = component;
  const { isDrafting } = useAppSelector(selectDraftId);

  const getDates = (x: number, y: number) => {
    const _start = dateCalcs.getDateByXY(
      x - SIDEBAR_OPEN_WIDTH,
      y,
      startOfSelectedWeekDay
    );
    const startDate = _start.format();
    const endDate = _start.add(1, "hour").format();
    return { startDate, endDate };
  };

  const convertSomedayDraftToTimed = (
    dropItem: DropResult,
    dates: { startDate: string; endDate: string }
  ) => {
    const event = prepEvtAfterDraftDrop(
      Categories_Event.TIMED,
      dropItem,
      dates
    );

    dispatch(createEventSlice.actions.request(event));
    dispatch(draftSlice.actions.discard());
  };

  const onMouseDown = (e: MouseEvent) => {
    if (isDrafting) {
      dispatch(draftSlice.actions.discard());
      return;
    }

    startTimedDraft(e);
  };

  const startTimedDraft = (e: MouseEvent) => {
    const x = getX(e, isSidebarOpen);
    const _start = dateCalcs.getDateByXY(x, e.clientY, component.startOfView);
    const startDate = _start.format();
    const endDate = _start.add(DRAFT_DURATION_MIN, "minutes").format();

    const event = getDefaultEvent(Categories_Event.TIMED, startDate, endDate);
    dispatch(
      draftSlice.actions.startResizing({ event, dateToChange: "endDate" })
    );
  };

  const [{ canDrop, isOver }, drop] = useDrop(
    () => ({
      accept: Category_DragItem.EVENT_SOMEDAY,
      drop: (item: DropResult, monitor) => {
        const { x, y } = monitor.getClientOffset();
        const dates = getDates(x, y);

        if (item._id) {
          console.log("logic moved to useSidebarDraft");
        } else {
          convertSomedayDraftToTimed(item, dates);
        }
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
      //++ ref={mergeRefs([drop, mainGridRef, scrollRef])}
      ref={mergeRefs([mainGridRef, scrollRef])}
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
