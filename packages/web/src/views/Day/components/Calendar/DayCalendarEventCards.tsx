import { useCallback, useMemo, useRef, useState } from "react";
import { ZIndex } from "@web/common/constants/web.constants";
import { theme } from "@web/common/styles/theme";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { CalendarAllDayEventCard } from "@web/layout/calendar-grid/components/CalendarAllDayEventCard";
import { CalendarTimedEventCard } from "@web/layout/calendar-grid/components/CalendarTimedEventCard";
import {
  getCalendarAllDayEventPosition,
  getCalendarTimedEventPosition,
} from "@web/layout/calendar-grid/layout/calendarEventPosition";
import {
  applyCalendarTimedEventDisplayPosition,
  type CalendarTimedDeckLayout,
} from "@web/layout/calendar-grid/layout/calendarTimedDeckLayout";
import {
  type CalendarGridMeasurements,
  type CalendarGridVisibleDate,
} from "@web/layout/calendar-grid/types/calendarGrid.types";
import {
  type DayInteractionEventType,
  dayCalendarEventRegistry,
  getDayInteractionTargetAttributes,
} from "@web/views/Day/interaction/registry/dayCalendarEventRegistry";
import {
  clearHoveredDayCalendarEventTarget,
  setHoveredDayCalendarEventTarget,
} from "@web/views/Day/interaction/targeting/dayCalendarEventTargeting";

interface DayEventCardProps {
  event: Schema_GridEvent;
  isActiveDraft: boolean;
  isPlaceholder: boolean;
  measurements: CalendarGridMeasurements;
  onOpenEvent: (event: Schema_GridEvent) => void;
  visibleDates: CalendarGridVisibleDate[];
}

interface DayTimedEventCardProps extends DayEventCardProps {
  deckLayout: CalendarTimedDeckLayout | null;
}

export const DayAllDayCalendarEvent = ({
  event,
  isActiveDraft,
  isPlaceholder,
  measurements,
  onOpenEvent,
  visibleDates,
}: DayEventCardProps) => {
  const isRegistered = Boolean(event._id) && !isPlaceholder;
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

  const position = getCalendarAllDayEventPosition(event, {
    isDraft: isPlaceholder,
    measurements,
    visibleDates,
  });

  return (
    <CalendarAllDayEventCard
      event={event}
      interactionAttributes={interactionAttributes}
      isPlaceholder={isPlaceholder}
      onEventKeyDown={onOpenEvent}
      onMouseEnter={(mouseEvent) => {
        if (!isRegistered) return;

        setHoveredDayCalendarEventTarget(mouseEvent.currentTarget);
      }}
      onMouseLeave={(mouseEvent) => {
        clearHoveredDayCalendarEventTarget(mouseEvent.currentTarget);
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
  deckLayout,
  event,
  isActiveDraft,
  isPlaceholder,
  measurements,
  onOpenEvent,
  visibleDates,
}: DayTimedEventCardProps) => {
  const isRegistered = Boolean(event._id) && !isPlaceholder;
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
  const deckBoxShadow = (() => {
    if (!isDeck) return undefined;
    const ring = `0 0 0 0.75px ${theme.color.bg.primary}`;
    const drop = isFocused
      ? "0 6px 14px -3px rgba(0,0,0,0.55)"
      : "0 3px 6px -2px rgba(0,0,0,0.4)";
    const highlight = `inset 0 1px 0 rgba(255,255,255,${isFocused ? 0.1 : 0.07})`;
    return `${ring}, ${drop}, ${highlight}`;
  })();
  const shouldFloatAboveDeck = isActiveDraft && !isDeck;
  const position = getDayTimedEventPosition({
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
    <CalendarTimedEventCard
      boxShadow={deckBoxShadow}
      displayMode={isPlaceholder ? "placeholder" : "saved"}
      event={event}
      interactionAttributes={interactionAttributes}
      isSelected={isActiveDraft}
      motionMode="idle"
      onBlur={isDeck ? () => setIsFocused(false) : undefined}
      onEventKeyDown={onOpenEvent}
      onFocus={isDeck ? () => setIsFocused(true) : undefined}
      onMouseEnter={(mouseEvent) => {
        if (!isRegistered) return;

        setHoveredDayCalendarEventTarget(mouseEvent.currentTarget);
      }}
      onMouseLeave={(mouseEvent) => {
        clearHoveredDayCalendarEventTarget(mouseEvent.currentTarget);
      }}
      position={{ ...position, zIndex }}
      ref={registrationRef}
    />
  );
};

const getDayTimedEventPosition = ({
  deckLayout,
  event,
  isPlaceholder,
  measurements,
  visibleDates,
}: {
  deckLayout: CalendarTimedDeckLayout | null;
  event: Schema_GridEvent;
  isPlaceholder: boolean;
  measurements: CalendarGridMeasurements;
  visibleDates: CalendarGridVisibleDate[];
}) => {
  const position = getCalendarTimedEventPosition(event, {
    isDraft: isPlaceholder,
    measurements,
    visibleDates,
  });

  return applyCalendarTimedEventDisplayPosition(position, deckLayout);
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

      unregisterRef.current = dayCalendarEventRegistry.register({
        element: node,
        eventId,
        eventType,
      });
    },
    [eventId, eventType, isEnabled],
  );
};
