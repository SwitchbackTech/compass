import { useMemo } from "react";
import { Categories_Event } from "@core/types/event.types";
import {
  type CalendarTimedDeckLayout,
  createCalendarTimedEventLayout,
} from "@web/common/calendar-grid/layout/calendarTimedDeckLayout";
import { ID_GRID_EVENTS_TIMED } from "@web/common/constants/web.constants";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { useWeekEventViewModel } from "@web/events/queries/useWeekEventsQuery";
import {
  draftActions,
  selectDraft,
  selectDraftId,
  useDraftStore,
} from "@web/events/stores/draft.store";
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
  const draft = useDraftStore(selectDraft);
  const { isPending: isLoadingWeekView, timedEvents } = useWeekEventViewModel({
    startOfView: weekProps.component.startOfView,
    endOfView: weekProps.component.endOfView,
  });
  const draftId = useDraftStore(selectDraftId);
  const timedEventItems = useMemo(
    () => createCalendarTimedEventLayout(timedEvents),
    [timedEvents],
  );
  const category = Categories_Event.TIMED;

  const handleKeyDown = (event: Schema_GridEvent) => {
    draftActions.start({
      activity: "keyboardEdit",
      event,
      eventType: category,
    });
  };

  return (
    <div id={ID_GRID_EVENTS_TIMED}>
      {!isLoadingWeekView &&
        timedEventItems.map(({ deckLayout, event }) => {
          const isPlaceholder = event._id === draftId;
          const eventForDisplay =
            isPlaceholder && draft && draft._id === event._id
              ? { ...event, ...draft }
              : event;

          return (
            <MainGridEventItem
              deckLayout={deckLayout}
              event={eventForDisplay}
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
  isPlaceholder: boolean;
  measurements: Measurements_Grid;
  onEventKeyDown: (event: Schema_GridEvent) => void;
  weekProps: WeekProps;
}

const MainGridEventItem = ({
  deckLayout,
  event,
  isPlaceholder,
  measurements,
  onEventKeyDown,
  weekProps,
}: MainGridEventItemProps) => {
  const isRegisteredForWeekInteraction = Boolean(event._id) && !isPlaceholder;
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
      measurements={measurements}
      onEventKeyDown={onEventKeyDown}
      ref={registrationRef}
      weekProps={weekProps}
    />
  );
};
