import React, { MouseEvent, useCallback } from "react";
import { Categories_Event, Schema_Event } from "@core/types/event.types";
import { ID_GRID_EVENTS_ALLDAY } from "@web/common/constants/web.constants";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { selectAllDayEvents } from "@web/ducks/events/selectors/event.selectors";
import {
  selectDraftId,
  selectDraftStatus,
  selectIsDrafting,
} from "@web/ducks/events/selectors/draft.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { isEventFormOpen } from "@web/common/utils";

import { StyledEvents } from "./styled";
import { AllDayEventMemo } from "./AllDayEvent";

interface Props {
  isDrafting: boolean;
  measurements: Measurements_Grid;
  startOfView: WeekProps["component"]["startOfView"];
  endOfView: WeekProps["component"]["endOfView"];
}
export const AllDayEvents = ({
  isDrafting,
  measurements,
  startOfView,
  endOfView,
}: Props) => {
  const allDayEvents = useAppSelector(selectAllDayEvents);
  // const isDrafting = useAppSelector(selectIsDrafting);
  const draftId = useAppSelector(selectDraftId);
  // const draftStatus = useAppSelector(selectDraftStatus);
  const dispatch = useAppDispatch();

  const onMouseDown = (e: MouseEvent, event: Schema_Event) => {
    e.stopPropagation();

    // console.log("draftId:", draftId);
    // if (draftStatus.eventType === Categories_Event.SOMEDAY_WEEK) {
    // if (isDrafting) {
    // if (isDrafting) {
    if (isEventFormOpen()) {
      console.log("not starting drag");
      console.log("closing existing draft");
      dispatch(draftSlice.actions.discard());
      // return;
    }

    // console.log("about to start dragging, cuz", draftStatus, event);
    console.log("starting drag");
    dispatch(draftSlice.actions.startDragging({ event }));
  };

  return (
    <StyledEvents id={ID_GRID_EVENTS_ALLDAY}>
      {allDayEvents.map((event: Schema_Event, i) => {
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
