import { type MouseEvent, useCallback, useMemo, useRef, useState } from "react";
import { type CalendarCardIdentity } from "@web/calendars/useCalendarLookup";
import { ZIndex } from "@web/common/constants/web.constants";
import { colors } from "@web/common/styles/colors";
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
  type DayInteractionEventType,
  dayEventRegistry,
  getDayInteractionTargetAttributes,
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
  // Read-only events never register as an interaction target below, so the
  // drag/resize engine can't find them - blocked before any optimistic
  // state change reaches the store (packet 08 step 8).
  const isRegistered = Boolean(event._id) && !isPlaceholder && !isReadOnly;
  const registrationRef = useDayEventRegistrationRef({
    eventId: event._id,
    eventType: "all-day",
    isEnabled: isRegistered,
  });
  const interactionAttributes = useMemo(
    () =>
      isRegistered
        ? getDayInteractionTargetAttributes({
            eventId: event._id,
            eventType: "all-day",
          })
        : undefined,
    [event._id, isRegistered],
  );
  // Being unregistered above also means the interaction engine's own click
  // resolution never fires, so a read-only card would otherwise stop being
  // clickable - events must stay inspectable even when they can't be
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
        if (!isRegistered) return;

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
  // Read-only events never register as an interaction target below, so the
  // drag/resize engine can't find them - blocked before any optimistic
  // state change reaches the store (packet 08 step 8).
  const isRegistered = Boolean(event._id) && !isPlaceholder && !isReadOnly;
  const isDeck = Boolean(deckLayout);
  const [isFocused, setIsFocused] = useState(false);
  const registrationRef = useDayEventRegistrationRef({
    eventId: event._id,
    eventType: "timed",
    isEnabled: isRegistered,
  });
  const interactionAttributes = useMemo(
    () =>
      isRegistered
        ? getDayInteractionTargetAttributes({
            eventId: event._id,
            eventType: "timed",
          })
        : undefined,
    [event._id, isRegistered],
  );
  // Being unregistered above also means the interaction engine's own click
  // resolution never fires, so a read-only card would otherwise stop being
  // clickable - events must stay inspectable even when they can't be
  // mutated. Wiring the click straight to the same "open" action the
  // keyboard path uses bypasses the engine entirely for this card.
  const onEventMouseDown = isReadOnly
    ? (clickedEvent: GridEvent) => onOpenEvent(clickedEvent)
    : undefined;
  const deckBoxShadow = (() => {
    if (!isDeck) return undefined;
    const ring = `0 0 0 0.75px ${colors.background}`;
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
        if (!isRegistered) return;

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

const useDayEventRegistrationRef = ({
  eventId,
  eventType,
  isEnabled,
}: {
  eventId: string | undefined;
  eventType: DayInteractionEventType;
  isEnabled: boolean;
}) => {
  const unregisterRef = useRef<(() => void) | null>(null);

  return useCallback(
    (node: HTMLDivElement | null) => {
      unregisterRef.current?.();
      unregisterRef.current = null;

      if (!node || !eventId || !isEnabled) {
        return;
      }

      unregisterRef.current = dayEventRegistry.register({
        element: node,
        eventId,
        eventType,
      });
    },
    [eventId, eventType, isEnabled],
  );
};
