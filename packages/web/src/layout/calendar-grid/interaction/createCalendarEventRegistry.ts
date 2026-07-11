export interface CalendarInteractionRegisteredTarget<TType extends string> {
  element: HTMLElement;
  eventId: string;
  eventType: TType;
}

export interface CalendarEventRegistry<TType extends string> {
  clear(): void;
  register(
    registration: CalendarInteractionRegisteredTarget<TType>,
  ): () => void;
  resolve(eventId: string, eventType: TType): HTMLElement | null;
  resolveFromTarget(
    target: EventTarget | null,
  ): CalendarInteractionRegisteredTarget<TType> | null;
}

export interface CalendarEventRegistryOptions<TType extends string> {
  eventIdAttribute: string;
  eventTypeAttribute: string;
  isEventType: (value: string | null) => value is TType;
}

export const createCalendarEventRegistry = <TType extends string>({
  eventIdAttribute,
  eventTypeAttribute,
  isEventType,
}: CalendarEventRegistryOptions<TType>): CalendarEventRegistry<TType> => {
  const events = new Map<string, CalendarInteractionRegisteredTarget<TType>>();
  const getRegistryKey = (eventId: string, eventType: TType) =>
    `${eventType}:${eventId}`;

  const isRegistrationCurrent = ({
    element,
    eventId,
    eventType,
  }: CalendarInteractionRegisteredTarget<TType>) =>
    element.isConnected &&
    element.getAttribute(eventIdAttribute) === eventId &&
    element.getAttribute(eventTypeAttribute) === eventType;

  const resolve = (eventId: string, eventType: TType) => {
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

  return {
    clear: () => events.clear(),
    register: ({ element, eventId, eventType }) => {
      element.setAttribute(eventIdAttribute, eventId);
      element.setAttribute(eventTypeAttribute, eventType);

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
    },
    resolve,
    resolveFromTarget: (target) => {
      if (!(target instanceof Element)) {
        return null;
      }

      const element = target.closest<HTMLElement>(
        `[${eventIdAttribute}][${eventTypeAttribute}]`,
      );

      if (!element) {
        return null;
      }

      const eventId = element.getAttribute(eventIdAttribute);
      const eventType = element.getAttribute(eventTypeAttribute);

      if (!eventId || !isEventType(eventType)) {
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
    },
  };
};
