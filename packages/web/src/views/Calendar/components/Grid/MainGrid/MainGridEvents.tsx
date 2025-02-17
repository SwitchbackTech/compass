import React, { MouseEvent } from "react";
import { Categories_Event } from "@core/types/event.types";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { selectGridEvents } from "@web/ducks/events/selectors/event.selectors";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { ID_GRID_EVENTS_TIMED } from "@web/common/constants/web.constants";
import { selectDraftId } from "@web/ducks/events/selectors/draft.selectors";
import { isEventFormOpen } from "@web/common/utils";
import { adjustOverlappingEvents } from "@web/common/utils/overlap/overlap";

import { GridEventMemo } from "../../Event/Grid/GridEvent/GridEvent";

interface Props {
  measurements: Measurements_Grid;
  weekProps: WeekProps;
}

export const MainGridEvents = ({ measurements, weekProps }: Props) => {
  const dispatch = useAppDispatch();

  const timedEvents = useAppSelector(selectGridEvents);
  const draftId = useAppSelector(selectDraftId);

  const adjustedEvents = adjustOverlappingEvents(timedEvents);

  const onMouseDown = (e: MouseEvent, event: Schema_GridEvent) => {
    e.stopPropagation();
    if (isEventFormOpen()) {
      console.log("swapping...", event);
      dispatch(
        draftSlice.actions.swap({ event, category: Categories_Event.TIMED }),
      );
      return;
    }

    editTimedEvent(event);
  };

  const resizeTimedEvent = (
    event: Schema_GridEvent,
    dateToChange: "startDate" | "endDate",
  ) => {
    dispatch(draftSlice.actions.startResizing({ event, dateToChange }));
  };

  const editTimedEvent = (event: Schema_GridEvent) => {
    dispatch(
      draftSlice.actions.startDragging({
        event,
      }),
    );
  };

  return (
    <div id={ID_GRID_EVENTS_TIMED}>
      {adjustedEvents.map((event: Schema_GridEvent) => {
        return (
          <GridEventMemo
            event={event}
            isDragging={false}
            isDraft={false}
            isPlaceholder={event._id === draftId}
            isResizing={false}
            key={`initial-${event._id}`}
            measurements={measurements}
            onMouseUp={() => console.log("mouse up")}
            onEventMouseDown={(event, e) => {
              onMouseDown(e, event);
            }}
            onScalerMouseDown={(
              event,
              e,
              dateToChange: "startDate" | "endDate",
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
