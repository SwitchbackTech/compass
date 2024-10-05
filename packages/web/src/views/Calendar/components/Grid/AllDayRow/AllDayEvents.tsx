import React from "react";
import { Schema_Event } from "@core/types/event.types";
import { ID_GRID_EVENTS_ALLDAY } from "@web/common/constants/web.constants";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { useAppSelector } from "@web/store/store.hooks";
import { selectAllDayEvents } from "@web/ducks/events/selectors/event.selectors";
import { selectDraftId } from "@web/ducks/events/selectors/draft.selectors";

import { StyledEvents } from "./styled";
import { AllDayEventMemo } from "./AllDayEvent";

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
  const { draftId } = useAppSelector(selectDraftId);

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
          />
        );
      })}
    </StyledEvents>
  );
};
