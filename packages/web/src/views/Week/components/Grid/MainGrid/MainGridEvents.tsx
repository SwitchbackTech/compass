import { useMemo } from "react";
import { Categories_Event } from "@core/types/event.types";
import {
  type CalendarCardIdentity,
  resolveCalendarCardIdentity,
  useCalendarLookup,
} from "@web/calendars/useCalendarLookup";
import { ID_GRID_EVENTS_TIMED } from "@web/common/constants/web.constants";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { useWeekEventViewModel } from "@web/events/queries/useWeekEventsQuery";
import {
  draftActions,
  selectDraft,
  selectDraftId,
  useDraftStore,
} from "@web/events/stores/draft.store";
import {
  type CalendarTimedDeckLayout,
  createCalendarTimedEventLayout,
} from "@web/layout/calendar-grid/layout/calendarTimedDeckLayout";
import { type Measurements_Grid } from "@web/views/Week/hooks/grid/useGridLayout";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import {
  getWeekInteractionTargetAttributes,
  useWeekEventRegistrationRef,
} from "@web/views/Week/interaction/registry/weekEventRegistry";
import { isTimedEventInVisibleDays } from "@web/views/Week/util/week-window.util";
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
  const weekDays = weekProps.component.weekDays;
  // One lookup build for the whole list (packet 08 step 5) - not per card.
  const calendarLookup = useCalendarLookup();
  // The query covers the full week; only mount events for the visible window
  // so off-window events never land in the DOM or the interaction registry.
  const visibleTimedEvents = useMemo(
    () =>
      timedEvents.filter((event) => isTimedEventInVisibleDays(event, weekDays)),
    [timedEvents, weekDays],
  );
  const timedEventItems = useMemo(
    () => createCalendarTimedEventLayout(visibleTimedEvents),
    [visibleTimedEvents],
  );
  // Resolved once per event here (not inside each card) and kept referentially
  // stable across renders where neither the events nor the calendars changed,
  // so GridEventMemo's per-card comparator doesn't over-invalidate.
  const timedEventItemsWithIdentity = useMemo(
    () =>
      timedEventItems.map((item) => ({
        ...item,
        calendarIdentity: resolveCalendarCardIdentity(
          calendarLookup,
          item.event.calendarId,
        ),
      })),
    [timedEventItems, calendarLookup],
  );
  const category = Categories_Event.TIMED;

  // NOT converted to GridEventDraft/editGridEventDraft: useDraftActions.ts
  // reads `draft.position.dragOffset` off this store's `event` field when a
  // keyboardEdit draft is subsequently repositioned by arrow keys, and
  // gridEventDraftToSchemaEvent has no grid-layout `position` to give it.
  // See packet-03-phase-3c scoping note.
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
        timedEventItemsWithIdentity.map(
          ({ deckLayout, event, calendarIdentity }) => {
            const isPlaceholder = event._id === draftId;
            const eventForDisplay =
              isPlaceholder && draft && draft._id === event._id
                ? { ...event, ...draft }
                : event;
            // The placeholder can carry a live (dragging/resizing) calendarId
            // from the draft store; everything else reuses the stable,
            // list-level resolved identity above.
            const identityForDisplay = isPlaceholder
              ? resolveCalendarCardIdentity(
                  calendarLookup,
                  eventForDisplay.calendarId,
                )
              : calendarIdentity;

            return (
              <MainGridEventItem
                calendarIdentity={identityForDisplay}
                deckLayout={deckLayout}
                event={eventForDisplay}
                isPlaceholder={isPlaceholder}
                key={`initial-${event._id}`}
                measurements={measurements}
                onEventKeyDown={handleKeyDown}
                weekProps={weekProps}
              />
            );
          },
        )}
    </div>
  );
};

interface MainGridEventItemProps {
  calendarIdentity: CalendarCardIdentity | null;
  deckLayout: CalendarTimedDeckLayout | null;
  event: Schema_GridEvent;
  isPlaceholder: boolean;
  measurements: Measurements_Grid;
  onEventKeyDown: (event: Schema_GridEvent) => void;
  weekProps: WeekProps;
}

const MainGridEventItem = ({
  calendarIdentity,
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
      calendarIdentity={calendarIdentity}
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
