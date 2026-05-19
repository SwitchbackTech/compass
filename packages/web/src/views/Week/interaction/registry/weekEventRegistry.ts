import {
  type ForwardedRef,
  type MutableRefObject,
  useCallback,
  useRef,
} from "react";

export const WEEK_INTERACTION_EVENT_ID_ATTRIBUTE =
  "data-week-interaction-event-id";
export const WEEK_INTERACTION_EVENT_TYPE_ATTRIBUTE =
  "data-week-interaction-event-type";

export type WeekInteractionEventType = "all-day" | "timed";

export interface WeekInteractionRegisteredTarget {
  element: HTMLElement;
  eventId: string;
  eventType: WeekInteractionEventType;
}

const getRegistryKey = (eventId: string, eventType: WeekInteractionEventType) =>
  `${eventType}:${eventId}`;

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

export interface WeekEventRegistry {
  clear(): void;
  register(registration: WeekInteractionRegisteredTarget): () => void;
  resolve(
    eventId: string,
    eventType: WeekInteractionEventType,
  ): HTMLElement | null;
  resolveFromTarget(
    target: EventTarget | null,
  ): WeekInteractionRegisteredTarget | null;
}

export const createWeekEventRegistry = (): WeekEventRegistry => {
  const events = new Map<string, WeekInteractionRegisteredTarget>();

  const register = ({
    element,
    eventId,
    eventType,
  }: WeekInteractionRegisteredTarget) => {
    element.setAttribute(WEEK_INTERACTION_EVENT_ID_ATTRIBUTE, eventId);
    element.setAttribute(WEEK_INTERACTION_EVENT_TYPE_ATTRIBUTE, eventType);

    const key = getRegistryKey(eventId, eventType);

    events.set(key, {
      element,
      eventId,
      eventType,
    });

    return () => {
      const current = events.get(key);

      if (current?.element === element) {
        events.delete(key);
      }
    };
  };

  const resolve = (eventId: string, eventType: WeekInteractionEventType) => {
    const key = getRegistryKey(eventId, eventType);
    const registration = events.get(key);

    if (!registration) {
      return null;
    }

    if (!isRegistrationCurrent(registration)) {
      events.delete(key);
      return null;
    }

    return registration.element;
  };

  const resolveFromTarget = (target: EventTarget | null) => {
    if (!(target instanceof Element)) {
      return null;
    }

    const element = target.closest<HTMLElement>(
      `[${WEEK_INTERACTION_EVENT_ID_ATTRIBUTE}][${WEEK_INTERACTION_EVENT_TYPE_ATTRIBUTE}]`,
    );

    if (!element) {
      return null;
    }

    const eventId = element.getAttribute(WEEK_INTERACTION_EVENT_ID_ATTRIBUTE);
    const eventType = element.getAttribute(
      WEEK_INTERACTION_EVENT_TYPE_ATTRIBUTE,
    );

    if (!eventId || !isWeekInteractionEventType(eventType)) {
      return null;
    }

    const registeredElement = resolve(eventId, eventType);

    if (registeredElement !== element) {
      return null;
    }

    return {
      element: registeredElement,
      eventId,
      eventType,
    };
  };

  const clear = () => {
    events.clear();
  };

  return {
    clear,
    register,
    resolve,
    resolveFromTarget,
  };
};

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

const isRegistrationCurrent = ({
  element,
  eventId,
  eventType,
}: WeekInteractionRegisteredTarget) =>
  element.isConnected &&
  element.getAttribute(WEEK_INTERACTION_EVENT_ID_ATTRIBUTE) === eventId &&
  element.getAttribute(WEEK_INTERACTION_EVENT_TYPE_ATTRIBUTE) === eventType;
