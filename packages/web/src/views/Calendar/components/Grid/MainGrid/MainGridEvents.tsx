import React from "react";
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

import { GridEventMemo } from "../../Event/Grid/GridEvent/GridEvent";

interface Props {
  measurements: Measurements_Grid;
  weekProps: WeekProps;
}

export const MainGridEvents = ({ measurements, weekProps }: Props) => {
  const dispatch = useDispatch();

  const timedEvents = useSelector(selectGridEvents);
  const { isDrafting, draftId } = useSelector(selectDraftId);

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
            key={`initial-${event._id}`}
            measurements={measurements}
            onEventMouseDown={(event, e) => {
              e.stopPropagation();
              e.preventDefault();
              editTimedEvent(event);
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

/* old draft 
  // const { draftState, draftHelpers } = useDraft(
  //   dateCalcs,
  //   weekProps,
  //   isSidebarOpen
  // );
  // const isDrafting = draftState.draft;
  // const { draft, isDragging } = draftState;

  // const draftHelpersMemo = useMemo(() => draftHelpers, []);
  // const isDraggingMemo = useMemo(() => isDragging, []);
  // const draftIdMemo = useMemo(() => draft?._id || null, []);
  // const draftMemo = useMemo(() => draft, []);

*/

/* old
 const editTimedEventOld = (event: Schema_GridEvent) => {
    console.log("editing main grid event ...");
    dispatch(
      draftSlice.actions.start({
        event,
        eventType: Categories_Event.TIMED,
        activity: "dragging",
      })
    );
  };

*/
