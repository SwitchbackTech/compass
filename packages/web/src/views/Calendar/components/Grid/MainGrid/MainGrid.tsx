import React, { FC, MouseEvent } from "react";
import mergeRefs from "react-merge-refs";
import { Dayjs } from "dayjs";
import { Categories_Event } from "@core/types/event.types";
import { DRAFT_DURATION_MIN } from "@web/views/Calendar/layout.constants";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { Ref_Callback } from "@web/common/types/util.types";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { Ref_Grid } from "@web/views/Calendar/components/Grid/grid.types";
import { ID_GRID_MAIN } from "@web/common/constants/web.constants";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { getDefaultEvent } from "@web/common/utils/event.util";
import { getX } from "@web/common/utils/grid.util";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { selectDraftId } from "@web/ducks/events/selectors/draft.selectors";

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
  const { isCurrentWeek, week, weekDays } = component;
  const { isDrafting } = useAppSelector(selectDraftId);

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

  return (
    <StyledMainGrid
      id={ID_GRID_MAIN}
      onMouseDown={onMouseDown}
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
