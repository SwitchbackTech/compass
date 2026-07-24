import { type ForwardedRef } from "react";
import {
  createEventRegistry,
  type EventRegistry,
  type RegisteredEventTarget,
} from "@web/grid/interaction/event.registry";
import { useEventRegistrationRef } from "@web/grid/interaction/use-event-registration-ref";

export const WEEK_INTERACTION_EVENT_ID_ATTRIBUTE =
  "data-week-interaction-event-id";
export const WEEK_INTERACTION_EVENT_TYPE_ATTRIBUTE =
  "data-week-interaction-event-type";

export type WeekInteractionEventType = "all-day" | "timed";

export type WeekRegisteredEventTarget =
  RegisteredEventTarget<WeekInteractionEventType>;

const isWeekInteractionEventType = (
  value: string | null,
): value is WeekInteractionEventType =>
  value === "all-day" || value === "timed";

export const getWeekInteractionTargetAttributes = ({
  eventId,
  eventType,
}: {
  eventId: string | undefined;
  eventType: WeekInteractionEventType;
}) => {
  if (!eventId) {
    return {};
  }

  return {
    [WEEK_INTERACTION_EVENT_ID_ATTRIBUTE]: eventId,
    [WEEK_INTERACTION_EVENT_TYPE_ATTRIBUTE]: eventType,
  };
};

export type WeekEventRegistry = EventRegistry<WeekInteractionEventType>;

export const createWeekEventRegistry = (): WeekEventRegistry =>
  createEventRegistry<WeekInteractionEventType>({
    eventIdAttribute: WEEK_INTERACTION_EVENT_ID_ATTRIBUTE,
    eventTypeAttribute: WEEK_INTERACTION_EVENT_TYPE_ATTRIBUTE,
    isEventType: isWeekInteractionEventType,
  });

export const weekEventRegistry = createWeekEventRegistry();

export const useWeekEventRegistrationRef = ({
  eventId,
  eventType,
  forwardedRef,
  isEnabled,
  registry = weekEventRegistry,
}: {
  eventId: string | undefined;
  eventType: WeekInteractionEventType;
  forwardedRef?: ForwardedRef<HTMLDivElement>;
  isEnabled: boolean;
  registry?: WeekEventRegistry;
}) =>
  useEventRegistrationRef({
    eventId,
    eventType,
    forwardedRef,
    isEnabled,
    registry,
  });
