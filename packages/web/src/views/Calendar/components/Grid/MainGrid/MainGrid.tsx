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
import { assembleDefaultEvent } from "@web/common/utils/event.util";
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
import {
  selectIsDrafting,
  selectIsDraftingExisting,
} from "@web/ducks/events/selectors/draft.selectors";

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
  const isDrafting = useAppSelector(selectIsDrafting);

  //TODO remove
  // const onGridClick = async (e: MouseEvent) => {
  //   if (isDrafting) {
  //     console.log("todo discarding...");

  //     // todo next: this works for main grid, but now when
  //     // clicking outside on any other element its
  //     // still lingering the old draft cuz were not discarding there

  //     // ESC and repeating this flow also breaks
  //     dispatch(draftSlice.actions.discard());
  //     return;
  //   }

  //   console.log("form not open, so starting draft");
  //   await startTimedDraft(e);
  // };

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
            // onClick={onGridClick}
          />
        ))}
      </StyledGridWithTimeLabels>

      <MainGridEvents measurements={measurements} weekProps={weekProps} />
    </StyledMainGrid>
  );
};
