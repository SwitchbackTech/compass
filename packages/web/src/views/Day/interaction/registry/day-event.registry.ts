import { type ForwardedRef } from "react";
import {
  createEventRegistry,
  type EventRegistry,
  type RegisteredEventTarget,
} from "@web/grid/interaction/event.registry";
import { useEventRegistrationRef } from "@web/grid/interaction/use-event-registration-ref";

export const DAY_INTERACTION_EVENT_ID_ATTRIBUTE =
  "data-day-interaction-event-id";
export const DAY_INTERACTION_EVENT_TYPE_ATTRIBUTE =
  "data-day-interaction-event-type";

export type DayInteractionEventType = "all-day" | "timed";

export type DayRegisteredEventTarget =
  RegisteredEventTarget<DayInteractionEventType>;

export type DayEventRegistry = EventRegistry<DayInteractionEventType>;

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

export const createDayEventRegistry = (): DayEventRegistry =>
  createEventRegistry<DayInteractionEventType>({
    eventIdAttribute: DAY_INTERACTION_EVENT_ID_ATTRIBUTE,
    eventTypeAttribute: DAY_INTERACTION_EVENT_TYPE_ATTRIBUTE,
    isEventType: isDayInteractionEventType,
  });

export const dayEventRegistry = createDayEventRegistry();

export const useDayEventRegistrationRef = ({
  eventId,
  eventType,
  forwardedRef,
  isEnabled,
  registry = dayEventRegistry,
}: {
  eventId: string | undefined;
  eventType: DayInteractionEventType;
  forwardedRef?: ForwardedRef<HTMLDivElement>;
  isEnabled: boolean;
  registry?: DayEventRegistry;
}) =>
  useEventRegistrationRef({
    eventId,
    eventType,
    forwardedRef,
    isEnabled,
    registry,
  });
