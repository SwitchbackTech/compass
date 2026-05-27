import {
  type ForwardedRef,
  type MutableRefObject,
  useCallback,
  useRef,
} from "react";
import {
  type CalendarEventRegistry,
  type CalendarInteractionRegisteredTarget,
  createCalendarEventRegistry,
} from "@web/common/calendar-grid/interaction/createCalendarEventRegistry";

export const WEEK_INTERACTION_EVENT_ID_ATTRIBUTE =
  "data-week-interaction-event-id";
export const WEEK_INTERACTION_EVENT_TYPE_ATTRIBUTE =
  "data-week-interaction-event-type";

export type WeekInteractionEventType = "all-day" | "timed";

export type WeekInteractionRegisteredTarget =
  CalendarInteractionRegisteredTarget<WeekInteractionEventType>;

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

export type WeekEventRegistry = CalendarEventRegistry<WeekInteractionEventType>;

export const createWeekEventRegistry = (): WeekEventRegistry =>
  createCalendarEventRegistry<WeekInteractionEventType>({
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
}) => {
  const unregisterRef = useRef<(() => void) | null>(null);

  return useCallback(
    (node: HTMLDivElement | null) => {
      unregisterRef.current?.();
      unregisterRef.current = null;
      assignRef(forwardedRef, node);

      if (!node || !eventId || !isEnabled) {
        return;
      }

      unregisterRef.current = registry.register({
        element: node,
        eventId,
        eventType,
      });
    },
    [eventId, eventType, forwardedRef, isEnabled, registry],
  );
};

const assignRef = (
  ref: ForwardedRef<HTMLDivElement> | undefined,
  node: HTMLDivElement | null,
) => {
  if (!ref) {
    return;
  }

  if (typeof ref === "function") {
    ref(node);
    return;
  }

  (ref as MutableRefObject<HTMLDivElement | null>).current = node;
};
