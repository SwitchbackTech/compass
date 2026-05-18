import { Categories_Event } from "@core/types/event.types";
import { ID_GRID_EVENTS_ALLDAY } from "@web/common/constants/web.constants";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { Week_AsyncStateContextReason } from "@web/ducks/events/context/week.context";
import { selectDraftId } from "@web/ducks/events/selectors/draft.selectors";
import { selectAllDayEvents } from "@web/ducks/events/selectors/event.selectors";
import { selectIsGetWeekEventsProcessingWithReason } from "@web/ducks/events/selectors/util.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { AllDayEventMemo } from "@web/views/Week/components/Grid/AllDayRow/AllDayEvent";
import { StyledEvents } from "@web/views/Week/components/Grid/AllDayRow/styled";
import { type Measurements_Grid } from "@web/views/Week/hooks/grid/useGridLayout";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";

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
  const { isProcessing, reason } = useAppSelector(
    selectIsGetWeekEventsProcessingWithReason,
  );

  const draftId = useAppSelector(selectDraftId);
  const dispatch = useAppDispatch();
  const pendingEventIds = useAppSelector(
    (state) => state.events.pendingEvents.eventIds,
  );

  const handleKeyDown = (event: Schema_GridEvent) => {
    if (event._id && pendingEventIds.includes(event._id)) return;

    dispatch(
      draftSlice.actions.start({
        activity: "keyboardEdit",
        event,
        eventType: Categories_Event.ALLDAY,
      }),
    );
  };

  const isLoadingWeekView =
    isProcessing && reason === Week_AsyncStateContextReason.WEEK_VIEW_CHANGE;

  return (
    <StyledEvents id={ID_GRID_EVENTS_ALLDAY}>
      {!isLoadingWeekView &&
        allDayEvents.map((event: Schema_GridEvent) => (
          <AllDayEventMemo
            key={event._id}
            isPlaceholder={event._id === draftId}
            event={event}
            startOfView={startOfView}
            endOfView={endOfView}
            measurements={measurements}
            onKeyDown={handleKeyDown}
          />
        ))}
    </StyledEvents>
  );
};
