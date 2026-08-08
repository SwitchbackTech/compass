import { type MouseEvent, useMemo, useState } from "react";
import { type CalendarCardIdentity } from "@web/calendars/useCalendarLookup";
import { ZIndex } from "@web/common/constants/web.constants";
import { type GridEvent } from "@web/common/types/web.event.types";
import { AllDayEventCard } from "@web/grid/components/AllDayEventCard";
import { TimedEventCard } from "@web/grid/components/TimedEventCard";
import {
  getAllDayEventPosition,
  getTimedEventPosition,
} from "@web/grid/layout/event.position";
import {
  applyTimedEventDisplayPosition,
  type TimedDeckLayout,
} from "@web/grid/layout/timed-deck.layout";
import {
  type GridMeasurements,
  type GridVisibleDate,
} from "@web/grid/types/grid.types";
import {
  getDayInteractionTargetAttributes,
  useDayEventRegistrationRef,
} from "@web/views/Day/interaction/registry/day-event.registry";
import {
  clearHoveredDayGridEventTarget,
  setHoveredDayGridEventTarget,
} from "@web/views/Day/interaction/targeting/day-event.targeting";

interface DayEventCardProps {
  calendarIdentity?: CalendarCardIdentity | null;
  columnIndex: number;
  event: GridEvent;
  isActiveDraft: boolean;
  isPlaceholder: boolean;
  isReadOnly: boolean;
  measurements: GridMeasurements;
  onOpenEvent: (event: GridEvent) => void;
  visibleDates: GridVisibleDate[];
}

interface DayTimedEventCardProps extends DayEventCardProps {
  deckLayout: TimedDeckLayout | null;
}

export const DayAllDayCalendarEvent = ({
  calendarIdentity = null,
  columnIndex,
  event,
  isActiveDraft,
  isPlaceholder,
  isReadOnly,
  measurements,
  onOpenEvent,
  visibleDates,
}: DayEventCardProps) => {
  // Stamp view-registry id attrs whenever the card has an id (saved, draft,
  // or read-only) so context menus / focus restore can resolve it.
  // Drag/resize stays gated: registry registration + hover require a saved,
  // non-read-only card.
  const hasEventIdentity = Boolean(event._id);
  const isRegisteredForDragResize =
    hasEventIdentity && !isPlaceholder && !isReadOnly;
  const registrationRef = useDayEventRegistrationRef({
    eventId: event._id,
    eventType: "all-day",
    isEnabled: isRegisteredForDragResize,
  });
  const interactionAttributes = useMemo(
    () =>
      hasEventIdentity
        ? getDayInteractionTargetAttributes({
            eventId: event._id,
            eventType: "all-day",
          })
        : undefined,
    [event._id, hasEventIdentity],
  );
  // Unregistered for drag/resize also means the interaction engine's own
  // click resolution never fires, so a read-only card would otherwise stop
  // being clickable - events must stay inspectable even when they can't be
  // mutated. Wiring the click straight to the same "open" action the
  // keyboard path uses bypasses the engine entirely for this card.
  const onEventMouseDown = isReadOnly
    ? (_mouseEvent: MouseEvent, clickedEvent: GridEvent) =>
        onOpenEvent(clickedEvent)
    : undefined;

  const position = getAllDayEventPosition(event, {
    columnIndex,
    isDraft: isPlaceholder,
    measurements,
    visibleDates,
  });

  return (
    <AllDayEventCard
      calendarIdentity={calendarIdentity}
      event={event}
      interactionAttributes={interactionAttributes}
      isPlaceholder={isPlaceholder}
      onEventKeyDown={onOpenEvent}
      onEventMouseDown={onEventMouseDown}
      onMouseEnter={(mouseEvent) => {
        if (!isRegisteredForDragResize) return;

        setHoveredDayGridEventTarget(mouseEvent.currentTarget);
      }}
      onMouseLeave={(mouseEvent) => {
        clearHoveredDayGridEventTarget(mouseEvent.currentTarget);
      }}
      position={{
        ...position,
        zIndex: isActiveDraft
          ? ZIndex.MAX
          : (position.zIndex ?? ZIndex.LAYER_1),
      }}
      ref={registrationRef}
    />
  );
};

export const DayTimedCalendarEvent = ({
  calendarIdentity = null,
  columnIndex,
  deckLayout,
  event,
  isActiveDraft,
  isPlaceholder,
  isReadOnly,
  measurements,
  onOpenEvent,
  visibleDates,
}: DayTimedEventCardProps) => {
  // Stamp view-registry id attrs whenever the card has an id (saved, draft,
  // or read-only) so context menus / focus restore can resolve it.
  // Drag/resize stays gated: registry registration + hover require a saved,
  // non-read-only card.
  const hasEventIdentity = Boolean(event._id);
  const isRegisteredForDragResize =
    hasEventIdentity && !isPlaceholder && !isReadOnly;
  const isDeck = Boolean(deckLayout);
  const [isFocused, setIsFocused] = useState(false);
  const registrationRef = useDayEventRegistrationRef({
    eventId: event._id,
    eventType: "timed",
    isEnabled: isRegisteredForDragResize,
  });
  const interactionAttributes = useMemo(
    () =>
      hasEventIdentity
        ? getDayInteractionTargetAttributes({
            eventId: event._id,
            eventType: "timed",
          })
        : undefined,
    [event._id, hasEventIdentity],
  );
  // Unregistered for drag/resize also means the interaction engine's own
  // click resolution never fires, so a read-only card would otherwise stop
  // being clickable - events must stay inspectable even when they can't be
  // mutated. Wiring the click straight to the same "open" action the
  // keyboard path uses bypasses the engine entirely for this card.
  const onEventMouseDown = isReadOnly
    ? (clickedEvent: GridEvent) => onOpenEvent(clickedEvent)
    : undefined;
  const deckBoxShadow = (() => {
    if (!isDeck) return undefined;
    const ring = `0 0 0 0.75px var(--background)`;
    const drop = isFocused
      ? "0 6px 14px -3px rgba(0,0,0,0.55)"
      : "0 3px 6px -2px rgba(0,0,0,0.4)";
    const highlight = `inset 0 1px 0 rgba(255,255,255,${isFocused ? 0.1 : 0.07})`;
    return `${ring}, ${drop}, ${highlight}`;
  })();
  const shouldFloatAboveDeck = isActiveDraft && !isDeck;
  const position = getDayTimedEventPosition({
    columnIndex,
    deckLayout,
    event,
    isPlaceholder,
    measurements,
    visibleDates,
  });
  const zIndex = shouldFloatAboveDeck
    ? ZIndex.MAX
    : (position.zIndex ?? ZIndex.LAYER_1);

  return (
    <TimedEventCard
      boxShadow={deckBoxShadow}
      calendarIdentity={calendarIdentity}
      displayMode={isPlaceholder ? "placeholder" : "saved"}
      event={event}
      interactionAttributes={interactionAttributes}
      isSelected={isActiveDraft}
      motionMode="idle"
      onBlur={isDeck ? () => setIsFocused(false) : undefined}
      onEventKeyDown={onOpenEvent}
      onEventMouseDown={onEventMouseDown}
      onFocus={isDeck ? () => setIsFocused(true) : undefined}
      onMouseEnter={(mouseEvent) => {
        if (!isRegisteredForDragResize) return;

        setHoveredDayGridEventTarget(mouseEvent.currentTarget);
      }}
      onMouseLeave={(mouseEvent) => {
        clearHoveredDayGridEventTarget(mouseEvent.currentTarget);
      }}
      position={{ ...position, zIndex }}
      ref={registrationRef}
    />
  );
};

const getDayTimedEventPosition = ({
  columnIndex,
  deckLayout,
  event,
  isPlaceholder,
  measurements,
  visibleDates,
}: {
  columnIndex: number;
  deckLayout: TimedDeckLayout | null;
  event: GridEvent;
  isPlaceholder: boolean;
  measurements: GridMeasurements;
  visibleDates: GridVisibleDate[];
}) => {
  const position = getTimedEventPosition(event, {
    columnIndex,
    isDraft: isPlaceholder,
    measurements,
    visibleDates,
  });

  return applyTimedEventDisplayPosition(position, deckLayout);
};
