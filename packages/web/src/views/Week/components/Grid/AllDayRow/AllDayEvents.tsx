import { type MouseEvent, useMemo } from "react";
import {
  type CalendarCardIdentity,
  isEventReadOnly,
  resolveCalendarCardIdentity,
  useCalendarLookup,
} from "@web/calendars/useCalendarLookup";
import { ID_GRID_EVENTS_ALLDAY } from "@web/common/constants/web.constants";
import { type GridEvent } from "@web/common/types/web.event.types";
import {
  mergeGridEventWithDraftOverlay,
  useGridDraftSchemaOverlay,
} from "@web/events/hooks/useGridDraftSchemaOverlay";
import { useWeekEventViewModel } from "@web/events/queries/useWeekEventsQuery";
import { selectDraftId, useDraftStore } from "@web/events/stores/draft.store";
import { AllDayEventMemo } from "@web/views/Week/components/Grid/AllDayRow/AllDayEvent";
import { useGridEventDraftHandlers } from "@web/views/Week/components/Grid/useGridEventDraftHandlers";
import { type Measurements_Grid } from "@web/views/Week/hooks/grid/useGridLayout";
import { type WeekProps } from "@web/views/Week/hooks/useWeek";
import {
  getWeekInteractionTargetAttributes,
  useWeekEventRegistrationRef,
} from "@web/views/Week/interaction/registry/week-event.registry";
import { isAllDayEventInVisibleDays } from "@web/views/Week/util/week-window.util";

interface Props {
  measurements: Measurements_Grid;
  queryEndOfView: WeekProps["query"]["endOfView"];
  queryStartOfView: WeekProps["query"]["startOfView"];
  weekDays: WeekProps["component"]["weekDays"];
}
export const AllDayEvents = ({
  measurements,
  queryEndOfView,
  queryStartOfView,
  weekDays,
}: Props) => {
  const draftOverlay = useGridDraftSchemaOverlay();
  const {
    allDayEvents,
    events: weekEvents,
    isPending: isLoadingWeekView,
  } = useWeekEventViewModel({
    startOfView: queryStartOfView,
    endOfView: queryEndOfView,
  });

  const draftId = useDraftStore(selectDraftId);
  // One lookup build for the whole list (packet 08 step 5) - not per card.
  const calendarLookup = useCalendarLookup();
  // The query covers the full week; only mount events overlapping the visible
  // window so off-window events never land in the DOM or the interaction
  // registry.
  const visibleAllDayEvents = useMemo(
    () =>
      allDayEvents.filter(
        (event: GridEvent) =>
          isAllDayEventInVisibleDays(event, weekDays) &&
          !(event._id === draftId && !draftOverlay?.isAllDay),
      ),
    [allDayEvents, draftOverlay?.isAllDay, draftId, weekDays],
  );
  // Resolved once per event here (not inside each card) and kept referentially
  // stable across renders where neither the events nor the calendars changed,
  // so AllDayEventMemo's per-card comparator doesn't over-invalidate.
  const visibleAllDayEventsWithIdentity = useMemo(
    () =>
      visibleAllDayEvents.map((event) => ({
        event,
        calendarIdentity: resolveCalendarCardIdentity(
          calendarLookup,
          event.calendarId,
        ),
        // Read-only (unwritable calendar or busy content) events never
        // attach interaction attributes/registration below, so the drag/
        // resize engine can't find them as a target - blocked before any
        // optimistic state change (packet 08 step 8).
        isReadOnly: isEventReadOnly(
          calendarLookup,
          event.calendarId,
          (event.isBusy ?? false) || (event.isTimedMultiDayDisplay ?? false),
        ),
      })),
    [visibleAllDayEvents, calendarLookup],
  );

  const { onEventKeyDown, onOpenReadOnlyDetails } =
    useGridEventDraftHandlers(weekEvents);

  return (
    <div
      className="relative ml-[50px] h-full w-full"
      id={ID_GRID_EVENTS_ALLDAY}
    >
      {!isLoadingWeekView &&
        visibleAllDayEventsWithIdentity.map(
          ({ event, calendarIdentity, isReadOnly }) => {
            const isPlaceholder = event._id === draftId;
            const eventForDisplay = mergeGridEventWithDraftOverlay(
              event,
              draftOverlay,
            );
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
              <AllDayEventItem
                calendarIdentity={identityForDisplay}
                event={eventForDisplay}
                isPlaceholder={isPlaceholder}
                isReadOnly={isReadOnly}
                key={event._id}
                measurements={measurements}
                onKeyDown={onEventKeyDown}
                onOpenReadOnlyDetails={onOpenReadOnlyDetails}
                weekDays={weekDays}
              />
            );
          },
        )}
    </div>
  );
};

interface AllDayEventItemProps {
  calendarIdentity: CalendarCardIdentity | null;
  event: GridEvent;
  isPlaceholder: boolean;
  isReadOnly: boolean;
  measurements: Measurements_Grid;
  onKeyDown: (event: GridEvent) => void;
  onOpenReadOnlyDetails: (event: GridEvent) => void;
  weekDays: WeekProps["component"]["weekDays"];
}

const AllDayEventItem = ({
  calendarIdentity,
  event,
  isPlaceholder,
  isReadOnly,
  measurements,
  onKeyDown,
  onOpenReadOnlyDetails,
  weekDays,
}: AllDayEventItemProps) => {
  // Read-only events never register as an interaction target below, so the
  // drag/resize engine can't find them - blocked before any optimistic
  // state change reaches the store (packet 08 step 8).
  const isRegisteredForWeekInteraction =
    Boolean(event._id) && !isPlaceholder && !isReadOnly;
  const registrationRef = useWeekEventRegistrationRef({
    eventId: event._id,
    eventType: "all-day",
    isEnabled: isRegisteredForWeekInteraction,
  });

  const interactionAttributes = useMemo(
    () =>
      isRegisteredForWeekInteraction
        ? getWeekInteractionTargetAttributes({
            eventId: event._id,
            eventType: "all-day",
          })
        : undefined,
    [event._id, isRegisteredForWeekInteraction],
  );
  // Being unregistered above also means the interaction engine's own click
  // resolution never fires, so a read-only card would otherwise stop being
  // clickable - events must stay inspectable even when they can't be
  // mutated. Wiring the click straight to an "open" action bypasses the
  // engine entirely for this card.
  const onMouseDown = isReadOnly
    ? (_e: MouseEvent, clickedEvent: GridEvent) =>
        onOpenReadOnlyDetails(clickedEvent)
    : undefined;

  return (
    <AllDayEventMemo
      calendarIdentity={calendarIdentity}
      event={event}
      interactionAttributes={interactionAttributes}
      isPlaceholder={isPlaceholder}
      measurements={measurements}
      onKeyDown={isReadOnly ? onOpenReadOnlyDetails : onKeyDown}
      onMouseDown={onMouseDown}
      ref={registrationRef}
      weekDays={weekDays}
    />
  );
};
