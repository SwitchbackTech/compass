import {
  type ForwardedRef,
  type MutableRefObject,
  useCallback,
  useRef,
} from "react";
import { Categories_Event } from "@core/types/event.types";

export const SOMEDAY_INTERACTION_EVENT_ID_ATTRIBUTE =
  "data-someday-interaction-event-id";
export const SOMEDAY_INTERACTION_CATEGORY_ATTRIBUTE =
  "data-someday-interaction-category";

export type SomedayInteractionCategory =
  | Categories_Event.SOMEDAY_WEEK
  | Categories_Event.SOMEDAY_MONTH;

export interface SomedayInteractionRegisteredEvent {
  category: SomedayInteractionCategory;
  element: HTMLElement;
  eventId: string;
  index: number;
}

const isSomedayInteractionCategory = (
  value: string | null,
): value is SomedayInteractionCategory =>
  value === Categories_Event.SOMEDAY_WEEK ||
  value === Categories_Event.SOMEDAY_MONTH;

export interface SomedayEventRegistry {
  clear(): void;
  getEvents(
    category: SomedayInteractionCategory,
  ): SomedayInteractionRegisteredEvent[];
  register(registration: SomedayInteractionRegisteredEvent): () => void;
  resolveFromTarget(
    target: EventTarget | null,
  ): SomedayInteractionRegisteredEvent | null;
}

const createSomedayEventRegistry = (): SomedayEventRegistry => {
  const events = new Map<string, SomedayInteractionRegisteredEvent>();

  const register = (registration: SomedayInteractionRegisteredEvent) => {
    registration.element.setAttribute(
      SOMEDAY_INTERACTION_EVENT_ID_ATTRIBUTE,
      registration.eventId,
    );
    registration.element.setAttribute(
      SOMEDAY_INTERACTION_CATEGORY_ATTRIBUTE,
      registration.category,
    );

    events.set(registration.eventId, registration);

    return () => {
      const current = events.get(registration.eventId);

      if (current?.element === registration.element) {
        events.delete(registration.eventId);
      }
    };
  };

  const resolve = (eventId: string) => {
    const registration = events.get(eventId);

    if (!registration) {
      return null;
    }

    if (!isRegistrationCurrent(registration)) {
      events.delete(eventId);
      return null;
    }

    return registration;
  };

  const resolveFromTarget = (target: EventTarget | null) => {
    if (!(target instanceof Element)) {
      return null;
    }

    const element = target.closest<HTMLElement>(
      `[${SOMEDAY_INTERACTION_EVENT_ID_ATTRIBUTE}][${SOMEDAY_INTERACTION_CATEGORY_ATTRIBUTE}]`,
    );

    if (!element) {
      return null;
    }

    const eventId = element.getAttribute(
      SOMEDAY_INTERACTION_EVENT_ID_ATTRIBUTE,
    );
    const category = element.getAttribute(
      SOMEDAY_INTERACTION_CATEGORY_ATTRIBUTE,
    );

    if (!eventId || !isSomedayInteractionCategory(category)) {
      return null;
    }

    const registered = resolve(eventId);

    if (registered?.element !== element || registered.category !== category) {
      return null;
    }

    return registered;
  };

  const getEvents = (category: SomedayInteractionCategory) =>
    Array.from(events.values())
      .filter(
        (registration) =>
          registration.category === category &&
          isRegistrationCurrent(registration),
      )
      .sort((left, right) => left.index - right.index);

  const clear = () => {
    events.clear();
  };

  return {
    clear,
    getEvents,
    register,
    resolveFromTarget,
  };
};

export const somedayEventRegistry = createSomedayEventRegistry();

export const useSomedayEventRegistrationRef = ({
  category,
  eventId,
  forwardedRef,
  index,
  isEnabled,
  registry = somedayEventRegistry,
}: {
  category: SomedayInteractionCategory;
  eventId: string | undefined;
  forwardedRef?: ForwardedRef<HTMLDivElement>;
  index: number;
  isEnabled: boolean;
  registry?: SomedayEventRegistry;
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
        category,
        element: node,
        eventId,
        index,
      });
    },
    [category, eventId, forwardedRef, index, isEnabled, registry],
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
  category,
  element,
  eventId,
}: SomedayInteractionRegisteredEvent) =>
  element.isConnected &&
  element.getAttribute(SOMEDAY_INTERACTION_EVENT_ID_ATTRIBUTE) === eventId &&
  element.getAttribute(SOMEDAY_INTERACTION_CATEGORY_ATTRIBUTE) === category;
