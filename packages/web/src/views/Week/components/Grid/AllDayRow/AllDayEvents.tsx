import { useStore } from "react-redux";
import { Categories_Event } from "@core/types/event.types";
import { ID_GRID_EVENTS_ALLDAY } from "@web/common/constants/web.constants";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { Week_AsyncStateContextReason } from "@web/ducks/events/context/week.context";
import { selectDraftId } from "@web/ducks/events/selectors/draft.selectors";
import { selectAllDayEvents } from "@web/ducks/events/selectors/event.selectors";
import { selectIsEventPending } from "@web/ducks/events/selectors/pending.selectors";
import { selectIsGetWeekEventsProcessingWithReason } from "@web/ducks/events/selectors/util.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { type RootState } from "@web/store";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { AllDayEventMemo } from "@web/views/Week/components/Grid/AllDayRow/AllDayEvent";
import { StyledEvents } from "@web/views/Week/components/Grid/AllDayRow/styled";
import { type Measurements_Grid } from "@web/views/Week/hooks/grid/useGridLayout";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { areSelectedValuesEqualDuringWeekMotion } from "@web/views/Week/interaction/v2/motionSafeSelector";

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
  const allDayEvents = useAppSelector(
    selectAllDayEvents,
    areSelectedValuesEqualDuringWeekMotion,
  );
  const { isProcessing, reason } = useAppSelector(
    selectIsGetWeekEventsProcessingWithReason,
    areSelectedValuesEqualDuringWeekMotion,
  );

  const draftId = useAppSelector(
    selectDraftId,
    areSelectedValuesEqualDuringWeekMotion,
  );
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();

  const handleKeyDown = (event: Schema_GridEvent) => {
    const state = store.getState();
    if (selectIsEventPending(state, event._id!)) return;

    dispatch(
      draftSlice.actions.start({
        activity: "keyboardEdit",
        event,
        eventType: Categories_Event.ALLDAY,
      }),
    );
  };

  const renderEvents = () => {
    if (
      isProcessing &&
      reason === Week_AsyncStateContextReason.WEEK_VIEW_CHANGE
    ) {
      return null;
    }

    return allDayEvents.map((event: Schema_GridEvent) => {
      return (
        <AllDayEventMemo
          key={event._id}
          isPlaceholder={event._id === draftId}
          event={event}
          startOfView={startOfView}
          endOfView={endOfView}
          measurements={measurements}
          onMouseDown={() => {}}
          onKeyDown={handleKeyDown}
          onScalerMouseDown={(_event, e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
        />
      );
    });
  };

  return (
    <StyledEvents id={ID_GRID_EVENTS_ALLDAY}>{renderEvents()}</StyledEvents>
  );
};
