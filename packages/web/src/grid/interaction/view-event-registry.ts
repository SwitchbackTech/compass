import {
  createEventRegistry,
  type EventRegistry,
  type RegisteredEventTarget,
} from "@web/grid/interaction/event.registry";
import { useEventRegistrationRef } from "@web/grid/interaction/use-event-registration-ref";

export type ViewInteractionEventType = "all-day" | "timed";

const isViewInteractionEventType = (
  value: string | null,
): value is ViewInteractionEventType =>
  value === "all-day" || value === "timed";

export type ViewRegisteredEventTarget =
  RegisteredEventTarget<ViewInteractionEventType>;

export type ViewEventRegistry = EventRegistry<ViewInteractionEventType>;

/**
 * The `data-${viewName}-interaction-event-*` attribute names alone, with no
 * registry attached - for call sites (like stripping these attributes off a
 * cloned draft-event node) that need the naming scheme but have no reason to
 * instantiate a registry.
 */
export const viewInteractionAttributeNames = (viewName: string) => ({
  idAttribute: `data-${viewName}-interaction-event-id`,
  typeAttribute: `data-${viewName}-interaction-event-type`,
});

/**
 * Day and Week are sibling routes and never co-mounted, so a DOM query can
 * safely accept either view's id attribute. Used by context menus, undo
 * focus-restore, and other callers that need an event id without knowing
 * which view rendered the card.
 */
export const CALENDAR_VIEW_INTERACTION_ID_ATTRIBUTES = [
  viewInteractionAttributeNames("day").idAttribute,
  viewInteractionAttributeNames("week").idAttribute,
] as const;

export const calendarEventIdElementSelector = () =>
  CALENDAR_VIEW_INTERACTION_ID_ATTRIBUTES.map((attr) => `[${attr}]`).join(", ");

export const calendarEventIdValueSelector = (eventId: string) =>
  CALENDAR_VIEW_INTERACTION_ID_ATTRIBUTES.map(
    (attr) => `[${attr}="${eventId}"]`,
  ).join(", ");

export const readCalendarEventIdFromElement = (
  element: HTMLElement,
): string | null => {
  const eventElement = element.closest(calendarEventIdElementSelector());
  if (!eventElement) {
    return null;
  }

  for (const attr of CALENDAR_VIEW_INTERACTION_ID_ATTRIBUTES) {
    const eventId = eventElement.getAttribute(attr);
    if (eventId) {
      return eventId;
    }
  }

  return null;
};

/**
 * One interaction registry per calendar view (Day, Week), namespaced by
 * `data-${viewName}-interaction-event-*` attributes so a view only ever
 * resolves its own DOM nodes. Day and Week previously hand-rolled identical
 * copies of this wiring; this factory is the single source of it.
 */
export const createViewInteractionRegistry = (viewName: string) => {
  const { idAttribute, typeAttribute } =
    viewInteractionAttributeNames(viewName);

  const createRegistry = (): ViewEventRegistry =>
    createEventRegistry<ViewInteractionEventType>({
      eventIdAttribute: idAttribute,
      eventTypeAttribute: typeAttribute,
      isEventType: isViewInteractionEventType,
    });

  const getInteractionTargetAttributes = ({
    eventId,
    eventType,
  }: {
    eventId: string | undefined;
    eventType: ViewInteractionEventType;
  }) => {
    if (!eventId) {
      return {};
    }

    return {
      [idAttribute]: eventId,
      [typeAttribute]: eventType,
    };
  };

  const registry = createRegistry();

  const useRegistrationRef = ({
    eventId,
    eventType,
    isEnabled,
  }: {
    eventId: string | undefined;
    eventType: ViewInteractionEventType;
    isEnabled: boolean;
  }) =>
    useEventRegistrationRef({
      eventId,
      eventType,
      isEnabled,
      registry,
    });

  return {
    idAttribute,
    typeAttribute,
    createRegistry,
    registry,
    getInteractionTargetAttributes,
    useRegistrationRef,
  };
};
