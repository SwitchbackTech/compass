import React, { FC, MouseEvent, useCallback, useEffect } from "react";
import { Categories_Event } from "@core/types/event.types";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { Ref_Callback } from "@web/common/types/util.types";
import {
  ID_ALLDAY_COLUMNS,
  ID_GRID_ALLDAY_ROW,
  ID_GRID_MAIN,
} from "@web/common/constants/web.constants";
import { getX } from "@web/common/utils/grid.util";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { getDefaultEvent } from "@web/common/utils/event.util";
import { selectAllDayEvents } from "@web/ducks/events/selectors/event.selectors";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { isEventFormOpen } from "@web/common/utils";
import { selectIsDrafting } from "@web/ducks/events/selectors/draft.selectors";

import { StyledAllDayColumns, StyledGridCol } from "../Columns/styled";
import { StyledAllDayRow } from "./styled";
import { AllDayEvents } from "./AllDayEvents";

interface Props {
  dateCalcs: DateCalcs;
  allDayRef: Ref_Callback;
  isSidebarOpen: boolean;
  measurements: Measurements_Grid;
  weekProps: WeekProps;
}

export const AllDayRow: FC<Props> = ({
  allDayRef,
  dateCalcs,
  isSidebarOpen,
  measurements,
  weekProps,
}) => {
  const dispatch = useAppDispatch();
  const isDrafting = useAppSelector(selectIsDrafting);

  const { startOfView, weekDays } = weekProps.component;

  const allDayEvents = useAppSelector(selectAllDayEvents);
  const _rowVals = allDayEvents.map((e: Schema_GridEvent) => e.row);
  const rowsCount = _rowVals.length === 0 ? 1 : Math.max(..._rowVals);

  useEffect(() => {
    measurements.remeasure(ID_GRID_MAIN);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowsCount]);

  const startAlldayDraft = (e: MouseEvent) => {
    const x = getX(e, isSidebarOpen);
    const startDate = dateCalcs.getDateStrByXY(
      x,
      e.clientY,
      startOfView,
      YEAR_MONTH_DAY_FORMAT
    );

    const event = getDefaultEvent(Categories_Event.ALLDAY, startDate);
    dispatch(
      draftSlice.actions.start({
        eventType: Categories_Event.ALLDAY,
        event,
      })
    );
  };

  const onSectionMouseDown = (e: MouseEvent) => {
    // if (isEventFormOpen()) {
    if (isDrafting) {
      dispatch(draftSlice.actions.discard());
      return;
    }

    console.log("not drafting, starting new allday draft");
    startAlldayDraft(e);
  };

  return (
    <StyledAllDayRow
      id={ID_GRID_ALLDAY_ROW}
      rowsCount={rowsCount}
      onMouseDown={onSectionMouseDown}
    >
      <StyledAllDayColumns id={ID_ALLDAY_COLUMNS} ref={allDayRef}>
        {weekDays.map((day) => (
          <StyledGridCol color={null} key={day.format(YEAR_MONTH_DAY_FORMAT)} />
        ))}
      </StyledAllDayColumns>
      <AllDayEvents
        isDrafting={isDrafting}
        measurements={measurements}
        startOfView={weekProps.component.startOfView}
        endOfView={weekProps.component.endOfView}
      />
    </StyledAllDayRow>
  );
};
