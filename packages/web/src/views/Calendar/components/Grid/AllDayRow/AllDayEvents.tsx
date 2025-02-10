import React, { MouseEvent } from "react";
import { ID_GRID_ALLDAY_ROW } from "@web/common/constants/web.constants";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { selectAllDayEvents } from "@web/ducks/events/selectors/event.selectors";
import {
  selectDraftId,
  selectIsDrafting,
} from "@web/ducks/events/selectors/draft.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { isSomedayEventFormOpen } from "@web/common/utils";

import { StyledEvents } from "./styled";
import { AllDayEventMemo } from "./AllDayEvent";

interface Props {
  measurements: Measurements_Grid;
  startOfView: WeekProps["component"]["startOfView"];
  endOfView: WeekProps["component"]["endOfView"];
  onClick: (e: MouseEvent, event: Schema_GridEvent) => Promise<void>;
}
export const AllDayEvents = ({
  measurements,
  startOfView,
  endOfView,
  onClick,
}: Props) => {
  // const dispatch = useAppDispatch();
  const allDayEvents = useAppSelector(selectAllDayEvents);
  const draftId = useAppSelector(selectDraftId);
  // const isDrafting = useAppSelector(selectIsDrafting);

  // const onClick = (e: MouseEvent, event: Schema_GridEvent) => {
  //   e.stopPropagation();

  //   if (isDrafting) {
  //     console.log("todo: close draft");
  //   } else {
  //     dispatch(draftSlice.actions.)
  //     console.log("todo open this draft");
  //   }

  // TODO remove - shouldn't need to do this anymore
  // if (isSomedayEventFormOpen()) {
  //   console.log("discarding (someday form)");
  //   dispatch(draftSlice.actions.discard());
  //   return;
  // }

  //TODO move this to onMouseDown?
  // dispatch(draftSlice.actions.startDragging({ event }));
  // };

  return (
    <StyledEvents id={ID_GRID_ALLDAY_ROW}>
      {allDayEvents.map((event: Schema_GridEvent, i) => {
        return (
          <AllDayEventMemo
            key={`${event.title}-${i}`}
            isPlaceholder={event._id === draftId}
            event={event}
            startOfView={startOfView}
            endOfView={endOfView}
            measurements={measurements}
            onClick={onClick}
          />
        );
      })}
    </StyledEvents>
  );
};
