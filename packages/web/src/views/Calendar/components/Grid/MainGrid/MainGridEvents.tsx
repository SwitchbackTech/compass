import React, { MouseEvent } from "react";
import {
  selectDraftId,
  selectGridEvents,
} from "@web/ducks/events/event.selectors";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { useDispatch, useSelector } from "react-redux";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { draftSlice } from "@web/ducks/events/event.slice";
import { ID_GRID_EVENTS_TIMED } from "@web/common/constants/web.constants";
import { Categories_Event, Schema_Event } from "@core/types/event.types";

import { GridEventMemo } from "../../Event/Grid/GridEvent/GridEvent";

interface Props {
  measurements: Measurements_Grid;
  weekProps: WeekProps;
}

export const MainGridEvents = ({ measurements, weekProps }: Props) => {
  const dispatch = useDispatch();

  const timedEvents = useSelector(selectGridEvents);
  const { draftId, isDrafting } = useSelector(selectDraftId);

  const onMouseDown = (e: MouseEvent, event: Schema_Event) => {
    e.stopPropagation();
    if (isDrafting) {
      dispatch(
        draftSlice.actions.swap({ event, category: Categories_Event.TIMED })
      );
      return;
    }

    editTimedEvent(event);
  };

  const resizeTimedEvent = (
    event: Schema_GridEvent,
    dateToChange: "startDate" | "endDate"
  ) => {
    dispatch(draftSlice.actions.startResizing({ event, dateToChange }));
  };

  const editTimedEvent = (event: Schema_GridEvent) => {
    dispatch(
      draftSlice.actions.startDragging({
        event,
      })
    );
  };

  return (
    <div id={ID_GRID_EVENTS_TIMED}>
      {timedEvents.map((event: Schema_GridEvent) => {
        return (
          <GridEventMemo
            event={event}
            isDragging={false}
            isDraft={false}
            isPlaceholder={isDrafting && event._id === draftId}
            isResizing={false}
            key={`initial-${event._id}`}
            measurements={measurements}
            onEventMouseDown={(event, e) => {
              onMouseDown(e, event);
            }}
            onScalerMouseDown={(
              event,
              e,
              dateToChange: "startDate" | "endDate"
            ) => {
              e.stopPropagation();
              e.preventDefault();
              resizeTimedEvent(event, dateToChange);
            }}
            weekProps={weekProps}
          />
        );
      })}
    </div>
  );
};
