import { useStore } from "react-redux";
import { Categories_Event } from "@core/types/event.types";
import { ID_GRID_EVENTS_TIMED } from "@web/common/constants/web.constants";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { adjustOverlappingEvents } from "@web/common/utils/overlap/overlap";
import { Week_AsyncStateContextReason } from "@web/ducks/events/context/week.context";
import { selectDraftId } from "@web/ducks/events/selectors/draft.selectors";
import { selectGridEvents } from "@web/ducks/events/selectors/event.selectors";
import { selectIsEventPending } from "@web/ducks/events/selectors/pending.selectors";
import { selectIsGetWeekEventsProcessingWithReason } from "@web/ducks/events/selectors/util.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { type RootState } from "@web/store";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { type Measurements_Grid } from "@web/views/Week/hooks/grid/useGridLayout";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import { areSelectedValuesEqualDuringWeekMotion } from "@web/views/Week/interaction/v2/motionSafeSelector";
import { GridEventMemo } from "../../Event/Grid/GridEvent/GridEvent";

interface Props {
  measurements: Measurements_Grid;
  weekProps: WeekProps;
}

export const MainGridEvents = ({ measurements, weekProps }: Props) => {
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();

  const timedEvents = useAppSelector(
    selectGridEvents,
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

  const adjustedEvents = adjustOverlappingEvents(timedEvents);
  const category = Categories_Event.TIMED;

  const handleKeyDown = (event: Schema_GridEvent) => {
    // Prevent opening form for pending events (being created)
    const state = store.getState();
    if (selectIsEventPending(state, event._id!)) return;

    dispatch(
      draftSlice.actions.start({
        activity: "keyboardEdit",
        event,
        eventType: category,
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

    return adjustedEvents.map((event: Schema_GridEvent) => {
      return (
        <GridEventMemo
          event={event}
          isDragging={false}
          isDraft={false}
          isPlaceholder={event._id === draftId}
          isResizing={false}
          key={`initial-${event._id}`}
          measurements={measurements}
          onEventMouseDown={() => {}}
          onEventKeyDown={handleKeyDown}
          onScalerMouseDown={(_event, e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          weekProps={weekProps}
        />
      );
    });
  };

  return <div id={ID_GRID_EVENTS_TIMED}>{renderEvents()}</div>;
};
