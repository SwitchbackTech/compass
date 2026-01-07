import { useStore } from "react-redux";
import { Categories_Event } from "@core/types/event.types";
import { ID_GRID_EVENTS_ALLDAY } from "@web/common/constants/web.constants";
import { PartialMouseEvent } from "@web/common/types/util.types";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { getEventDragOffset } from "@web/common/utils/event/event.util";
import { isLeftClick } from "@web/common/utils/mouse/mouse.util";
import { Week_AsyncStateContextReason } from "@web/ducks/events/context/week.context";
import { selectDraftId } from "@web/ducks/events/selectors/draft.selectors";
import { selectAllDayEvents } from "@web/ducks/events/selectors/event.selectors";
import { selectIsEventPending } from "@web/ducks/events/selectors/pending.selectors";
import { selectIsGetWeekEventsProcessingWithReason } from "@web/ducks/events/selectors/util.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { AllDayEventMemo } from "@web/views/Calendar/components/Grid/AllDayRow/AllDayEvent";
import { StyledEvents } from "@web/views/Calendar/components/Grid/AllDayRow/styled";
import { useGridEventMouseDown } from "@web/views/Calendar/hooks/grid/useGridEventMouseDown";
import { Measurements_Grid } from "@web/views/Calendar/hooks/grid/useGridLayout";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";

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
  const store = useStore();

  const handleClick = (event: Schema_GridEvent) => {
    // Prevent opening form for pending events (being created)
    const state = store.getState();
    if (selectIsEventPending(state, event._id!)) return;

    dispatch(
      draftSlice.actions.start({
        activity: "gridClick",
        event,
        eventType: Categories_Event.ALLDAY,
      }),
    );
  };

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

  const handleDrag = (
    event: Schema_GridEvent,
    moveEvent: PartialMouseEvent,
  ) => {
    // Prevent dragging if event is pending (waiting for backend confirmation)
    const state = store.getState();
    if (selectIsEventPending(state, event._id!)) {
      return;
    }

    dispatch(
      draftSlice.actions.startDragging({
        category: Categories_Event.ALLDAY,
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
    Categories_Event.ALLDAY,
    handleClick,
    handleDrag,
  );

  const resizeAllDayEvent = (
    event: Schema_GridEvent,
    dateToChange: "startDate" | "endDate",
  ) => {
    dispatch(
      draftSlice.actions.startResizing({
        category: Categories_Event.ALLDAY,
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

    return allDayEvents.map((event: Schema_GridEvent, i) => {
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
          onKeyDown={handleKeyDown}
          onScalerMouseDown={(
            event,
            e,
            dateToChange: "startDate" | "endDate",
          ) => {
            e.stopPropagation();
            e.preventDefault();
            resizeAllDayEvent(event, dateToChange);
          }}
        />
      );
    });
  };

  return (
    <StyledEvents id={ID_GRID_EVENTS_ALLDAY}>{renderEvents()}</StyledEvents>
  );
};
