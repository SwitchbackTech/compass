import {
  createViewInteractionRegistry,
  type ViewEventRegistry,
  type ViewInteractionEventType,
  type ViewRegisteredEventTarget,
} from "@web/grid/interaction/view-event-registry";

const week = createViewInteractionRegistry("week");

export const WEEK_INTERACTION_EVENT_ID_ATTRIBUTE = week.idAttribute;
export const WEEK_INTERACTION_EVENT_TYPE_ATTRIBUTE = week.typeAttribute;

export type WeekInteractionEventType = ViewInteractionEventType;
export type WeekRegisteredEventTarget = ViewRegisteredEventTarget;
export type WeekEventRegistry = ViewEventRegistry;

export const getWeekInteractionTargetAttributes =
  week.getInteractionTargetAttributes;

export const createWeekEventRegistry = week.createRegistry;

export const weekEventRegistry = week.registry;

export const useWeekEventRegistrationRef = week.useRegistrationRef;
