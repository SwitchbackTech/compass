import React, { FC, MouseEvent } from "react";
import mergeRefs from "react-merge-refs";
import { Dayjs } from "dayjs";
import { Categories_Event } from "@core/types/event.types";
import { DRAFT_DURATION_MIN } from "@web/views/Calendar/layout.constants";
import { useAppDispatch } from "@web/store/store.hooks";
import { Ref_Callback } from "@web/common/types/util.types";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { DateCalcs } from "@web/views/Calendar/hooks/grid/useDateCalcs";
import { Ref_Grid } from "@web/views/Calendar/components/Grid/grid.types";
import { ID_GRID_MAIN } from "@web/common/constants/web.constants";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { getDefaultEvent } from "@web/common/utils/event.util";
import { getX } from "@web/common/utils/grid.util";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { isEventFormOpen } from "@web/common/utils";
import { getHourLabels } from "@web/common/utils/web.date.util";

import {
  StyledGridRow,
  StyledGridWithTimeLabels,
  StyledMainGrid,
} from "./styled";
import { MainGridEvents } from "./MainGridEvents";
import { MainGridColumns } from "../Columns/MainGridColumns";

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

  const onMouseDown = (e: MouseEvent) => {
    if (isEventFormOpen()) {
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
    <StyledMainGrid id={ID_GRID_MAIN} ref={mergeRefs([mainGridRef, scrollRef])}>
      <MainGridColumns
        isCurrentWeek={isCurrentWeek}
        today={today}
        week={week}
        weekDays={weekDays}
      />

      <StyledGridWithTimeLabels>
        {getHourLabels().map((dayTime, index) => (
          <StyledGridRow
            key={`${dayTime}-${index}:dayTimes`}
            onMouseDown={onMouseDown}
          />
        ))}
      </StyledGridWithTimeLabels>

      <MainGridEvents measurements={measurements} weekProps={weekProps} />
    </StyledMainGrid>
  );
};
