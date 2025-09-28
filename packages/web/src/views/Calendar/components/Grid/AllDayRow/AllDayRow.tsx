import React, { FC, MouseEvent, useEffect } from "react";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { Categories_Event } from "@core/types/event.types";
import {
  ID_ALLDAY_COLUMNS,
  ID_GRID_ALLDAY_ROW,
  ID_GRID_MAIN,
} from "@web/common/constants/web.constants";
import { Ref_Callback } from "@web/common/types/util.types";
import { assembleDefaultEvent } from "@web/common/utils/event/event.util";
import { getX } from "@web/common/utils/grid/grid.util";
import { isRightClick } from "@web/common/utils/mouse/mouse.util";
import { selectIsDrafting } from "@web/ducks/events/selectors/draft.selectors";
import { selectRowCount } from "@web/ducks/events/selectors/event.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { StyledGridCol } from "../Columns/styled";
import { AllDayEvents } from "./AllDayEvents";
import { StyledAllDayColumns, StyledAllDayRow } from "./styled";

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

  const { startOfView, weekDays } = weekProps.component;
  const rowsCount = useAppSelector(selectRowCount);
  const isDrafting = useAppSelector(selectIsDrafting);

  useEffect(() => {
    measurements.remeasure(ID_GRID_MAIN);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowsCount]);

  const startAlldayDraft = async (e: MouseEvent) => {
    const x = getX(e, isSidebarOpen);
    const startDate = dateCalcs.getDateStrByXY(
      x,
      e.clientY,
      startOfView,
      YEAR_MONTH_DAY_FORMAT,
    );

    const event = await assembleDefaultEvent(
      Categories_Event.ALLDAY,
      startDate,
    );

    dispatch(
      draftSlice.actions.start({
        activity: "gridClick",
        eventType: Categories_Event.ALLDAY,
        event,
      }),
    );
  };

  const onMouseDown = async (e: MouseEvent) => {
    if (isDrafting) {
      dispatch(draftSlice.actions.discard({}));
      return;
    }

    if (isRightClick(e)) {
      return;
    }

    await startAlldayDraft(e);
  };

  return (
    <StyledAllDayRow
      id={ID_GRID_ALLDAY_ROW}
      rowsCount={rowsCount}
      onMouseDown={onMouseDown}
    >
      <StyledAllDayColumns id={ID_ALLDAY_COLUMNS} ref={allDayRef}>
        {weekDays.map((day) => (
          <StyledGridCol color={null} key={day.format(YEAR_MONTH_DAY_FORMAT)} />
        ))}
      </StyledAllDayColumns>
      <AllDayEvents
        measurements={measurements}
        startOfView={weekProps.component.startOfView}
        endOfView={weekProps.component.endOfView}
      />
    </StyledAllDayRow>
  );
};
