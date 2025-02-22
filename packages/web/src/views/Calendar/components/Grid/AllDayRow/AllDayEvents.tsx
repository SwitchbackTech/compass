import React, { MouseEvent } from "react";
import { ID_GRID_EVENTS_ALLDAY } from "@web/common/constants/web.constants";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { isSomedayEventFormOpen } from "@web/common/utils";
import { selectDraftId } from "@web/ducks/events/selectors/draft.selectors";
import { selectAllDayEvents } from "@web/ducks/events/selectors/event.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { AllDayEventMemo } from "./AllDayEvent";
import { StyledEvents } from "./styled";

interface Props {
  measurements: Measurements_Grid;
  startOfView: WeekProps["component"]["startOfView"];
  endOfView: WeekProps["component"]["endOfView"];
}
export const AllDayEvents = ({
  measurements,
  startOfView,
  endOfView,
}: Props) => {
  const allDayEvents = useAppSelector(selectAllDayEvents);
  const draftId = useAppSelector(selectDraftId);
  const dispatch = useAppDispatch();

  const onMouseDown = (e: MouseEvent, event: Schema_GridEvent) => {
    e.stopPropagation();

    if (e.button !== 0) {
      return;
    }

    if (isSomedayEventFormOpen()) {
      dispatch(draftSlice.actions.discard());
    }

    dispatch(draftSlice.actions.startDragging({ event }));
  };

  return (
    <StyledEvents id={ID_GRID_EVENTS_ALLDAY}>
      {allDayEvents.map((event: Schema_GridEvent, i) => {
        return (
          <AllDayEventMemo
            key={`${event.title}-${i}`}
            isPlaceholder={event._id === draftId}
            event={event}
            startOfView={startOfView}
            endOfView={endOfView}
            measurements={measurements}
            onMouseDown={onMouseDown}
          />
        );
      })}
    </StyledEvents>
  );
};
