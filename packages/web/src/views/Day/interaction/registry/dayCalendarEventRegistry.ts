import {
  type CalendarEventRegistry,
  type CalendarInteractionRegisteredTarget,
  createCalendarEventRegistry,
} from "@web/common/calendar-grid/interaction/createCalendarEventRegistry";

export const DAY_INTERACTION_EVENT_ID_ATTRIBUTE =
  "data-day-interaction-event-id";
export const DAY_INTERACTION_EVENT_TYPE_ATTRIBUTE =
  "data-day-interaction-event-type";

export type DayInteractionEventType = "all-day" | "timed";

export type DayInteractionRegisteredTarget =
  CalendarInteractionRegisteredTarget<DayInteractionEventType>;

export type DayCalendarEventRegistry =
  CalendarEventRegistry<DayInteractionEventType>;

const isDayInteractionEventType = (
  value: string | null,
): value is DayInteractionEventType => value === "all-day" || value === "timed";

export const getDayInteractionTargetAttributes = ({
  eventId,
  eventType,
}: {
  eventId: string | undefined;
  eventType: DayInteractionEventType;
}) => {
  if (!eventId) {
    return {};
  }

  return {
    [DAY_INTERACTION_EVENT_ID_ATTRIBUTE]: eventId,
    [DAY_INTERACTION_EVENT_TYPE_ATTRIBUTE]: eventType,
  };
};

export const createDayCalendarEventRegistry = (): DayCalendarEventRegistry =>
  createCalendarEventRegistry<DayInteractionEventType>({
    eventIdAttribute: DAY_INTERACTION_EVENT_ID_ATTRIBUTE,
    eventTypeAttribute: DAY_INTERACTION_EVENT_TYPE_ATTRIBUTE,
    isEventType: isDayInteractionEventType,
  });

export const dayCalendarEventRegistry = createDayCalendarEventRegistry();
