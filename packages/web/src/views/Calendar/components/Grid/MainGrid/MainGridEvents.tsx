import { Categories_Event } from "@core/types/event.types";
import { ID_GRID_EVENTS_TIMED } from "@web/common/constants/web.constants";
import { PartialMouseEvent } from "@web/common/types/util.types";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { getEventDragOffset } from "@web/common/utils/event/event.util";
import { adjustOverlappingEvents } from "@web/common/utils/overlap/overlap";
import { Week_AsyncStateContextReason } from "@web/ducks/events/context/week.context";
import { selectDraftId } from "@web/ducks/events/selectors/draft.selectors";
import { selectGridEvents } from "@web/ducks/events/selectors/event.selectors";
import { selectIsGetWeekEventsProcessingWithReason } from "@web/ducks/events/selectors/util.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { useGridEventMouseDown } from "@web/views/Calendar/hooks/grid/useGridEventMouseDown";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { GridEventMemo } from "../../Event/Grid/GridEvent/GridEvent";

interface Props {
  measurements: Measurements_Grid;
  weekProps: WeekProps;
}

export const MainGridEvents = ({ measurements, weekProps }: Props) => {
  const dispatch = useAppDispatch();

  const timedEvents = useAppSelector(selectGridEvents);
  const { isProcessing, reason } = useAppSelector(
    selectIsGetWeekEventsProcessingWithReason,
  );
  const draftId = useAppSelector(selectDraftId);
  const pendingEventIds = useAppSelector(
    (state) => state.events.pendingEvents.eventIds,
  );

  const adjustedEvents = adjustOverlappingEvents(timedEvents);
  const category = Categories_Event.TIMED;

  const handleClick = (event: Schema_GridEvent) => {
    // Prevent opening form for pending events (being created)
    if (pendingEventIds.includes(event._id!)) return;

    dispatch(
      draftSlice.actions.start({
        activity: "gridClick",
        event,
        eventType: category,
      }),
    );
  };

  const handleDrag = (
    event: Schema_GridEvent,
    moveEvent: PartialMouseEvent,
  ) => {
    // Prevent dragging if event is pending (waiting for backend confirmation)
    if (pendingEventIds.includes(event._id!)) {
      return;
    }

    dispatch(
      draftSlice.actions.startDragging({
        category,
        event: {
          ...event,
          position: {
            ...event.position,
            dragOffset: getEventDragOffset(event, moveEvent),
            initialX: moveEvent.clientX,
            initialY: moveEvent.clientY,
          },
        },
      }),
    );
  };

  const { onMouseDown } = useGridEventMouseDown(
    Categories_Event.TIMED,
    handleClick,
    handleDrag,
  );

  const resizeTimedEvent = (
    event: Schema_GridEvent,
    dateToChange: "startDate" | "endDate",
  ) => {
    dispatch(
      draftSlice.actions.startResizing({
        category,
        event,
        dateToChange,
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
    });
  };

  return <div id={ID_GRID_EVENTS_TIMED}>{renderEvents()}</div>;
};
