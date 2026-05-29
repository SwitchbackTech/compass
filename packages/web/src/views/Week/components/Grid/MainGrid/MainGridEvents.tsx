import { useMemo } from "react";
import { Categories_Event } from "@core/types/event.types";
import {
  type CalendarTimedDeckLayout,
  createCalendarTimedEventLayout,
} from "@web/common/calendar-grid/layout/calendarTimedDeckLayout";
import { ID_GRID_EVENTS_TIMED } from "@web/common/constants/web.constants";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { Week_AsyncStateContextReason } from "@web/ducks/events/context/week.context";
import { selectDraftId } from "@web/ducks/events/selectors/draft.selectors";
import { selectGridEvents } from "@web/ducks/events/selectors/event.selectors";
import { selectIsGetWeekEventsProcessingWithReason } from "@web/ducks/events/selectors/util.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { type Measurements_Grid } from "@web/views/Week/hooks/grid/useGridLayout";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import {
  getWeekInteractionTargetAttributes,
  useWeekEventRegistrationRef,
} from "@web/views/Week/interaction/registry/weekEventRegistry";
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
  const pendingEventIds = useAppSelector(
    (state) => state.events.pendingEvents.eventIds,
  );
  const draftId = useAppSelector(selectDraftId);
  const timedEventItems = useMemo(
    () => createCalendarTimedEventLayout(timedEvents),
    [timedEvents],
  );
  const category = Categories_Event.TIMED;

  const handleKeyDown = (event: Schema_GridEvent) => {
    if (event._id && pendingEventIds.includes(event._id)) return;

    dispatch(
      draftSlice.actions.start({
        activity: "keyboardEdit",
        event,
        eventType: category,
      }),
    );
  };

  const isLoadingWeekView =
    isProcessing && reason === Week_AsyncStateContextReason.WEEK_VIEW_CHANGE;

  return (
    <div id={ID_GRID_EVENTS_TIMED}>
      {!isLoadingWeekView &&
        timedEventItems.map(({ deckLayout, event }) => {
          const isPending = Boolean(
            event._id && pendingEventIds.includes(event._id),
          );
          const isPlaceholder = event._id === draftId;

          return (
            <MainGridEventItem
              deckLayout={deckLayout}
              event={event}
              isPending={isPending}
              isPlaceholder={isPlaceholder}
              key={`initial-${event._id}`}
              measurements={measurements}
              onEventKeyDown={handleKeyDown}
              weekProps={weekProps}
            />
          );
        })}
    </div>
  );
};

interface MainGridEventItemProps {
  deckLayout: CalendarTimedDeckLayout | null;
  event: Schema_GridEvent;
  isPending: boolean;
  isPlaceholder: boolean;
  measurements: Measurements_Grid;
  onEventKeyDown: (event: Schema_GridEvent) => void;
  weekProps: WeekProps;
}

const MainGridEventItem = ({
  deckLayout,
  event,
  isPending,
  isPlaceholder,
  measurements,
  onEventKeyDown,
  weekProps,
}: MainGridEventItemProps) => {
  const isRegisteredForWeekInteraction =
    Boolean(event._id) && !isPlaceholder && !isPending;
  const registrationRef = useWeekEventRegistrationRef({
    eventId: event._id,
    eventType: "timed",
    isEnabled: isRegisteredForWeekInteraction,
  });
  const interactionAttributes = useMemo(
    () =>
      isRegisteredForWeekInteraction
        ? getWeekInteractionTargetAttributes({
            eventId: event._id,
            eventType: "timed",
          })
        : undefined,
    [event._id, isRegisteredForWeekInteraction],
  );

  return (
    <GridEventMemo
      deckLayout={deckLayout}
      displayMode={isPlaceholder ? "placeholder" : "saved"}
      event={event}
      interactionAttributes={interactionAttributes}
      isPending={isPending}
      measurements={measurements}
      onEventKeyDown={onEventKeyDown}
      ref={registrationRef}
      weekProps={weekProps}
    />
  );
};
