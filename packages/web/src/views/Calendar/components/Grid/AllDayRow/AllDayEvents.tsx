import React from "react";
import { Categories_Event } from "@core/types/event.types";
import { ID_GRID_EVENTS_ALLDAY } from "@web/common/constants/web.constants";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { isLeftClick } from "@web/common/utils/mouse/mouse.util";
import { selectDraftId } from "@web/ducks/events/selectors/draft.selectors";
import { selectAllDayEvents } from "@web/ducks/events/selectors/event.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { useGridEventMouseDown } from "@web/views/Calendar/hooks/grid/useGridEventMouseDown";
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

  const handleClick = (event: Schema_GridEvent) => {
    dispatch(
      draftSlice.actions.start({
        activity: "gridClick",
        event,
        eventType: Categories_Event.ALLDAY,
      }),
    );
  };

  const handleDrag = (event: Schema_GridEvent) => {
    dispatch(
      draftSlice.actions.startDragging({
        category: Categories_Event.ALLDAY,
        event,
      }),
    );
  };

  const { onMouseDown } = useGridEventMouseDown(
    Categories_Event.ALLDAY,
    handleClick,
    handleDrag,
  );

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
            onMouseDown={(e, event) => {
              if (!isLeftClick(e)) {
                return;
              }
              onMouseDown(e, event);
            }}
          />
        );
      })}
    </StyledEvents>
  );
};
