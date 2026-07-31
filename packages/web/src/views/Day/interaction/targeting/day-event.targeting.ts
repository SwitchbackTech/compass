import {
  createGridEventTargeting,
  type GridEventTarget as SharedGridEventTarget,
} from "@web/grid/interaction/event.targeting";
import {
  DAY_INTERACTION_EVENT_ID_ATTRIBUTE,
  DAY_INTERACTION_EVENT_TYPE_ATTRIBUTE,
  type DayInteractionEventType,
  dayEventRegistry,
} from "@web/views/Day/interaction/registry/day-event.registry";

export type DayGridEventTarget = SharedGridEventTarget<DayInteractionEventType>;

const TARGET_SELECTOR = `[${DAY_INTERACTION_EVENT_ID_ATTRIBUTE}][${DAY_INTERACTION_EVENT_TYPE_ATTRIBUTE}]`;

const dayGridEventTargeting = createGridEventTargeting<DayInteractionEventType>(
  {
    registry: dayEventRegistry,
    targetSelector: TARGET_SELECTOR,
  },
);

export const setHoveredDayGridEventTarget =
  dayGridEventTargeting.setHoveredGridEventTarget;

export const clearHoveredDayGridEventTarget =
  dayGridEventTargeting.clearHoveredGridEventTarget;

export const getFocusedDayGridEventTarget =
  dayGridEventTargeting.getFocusedGridEventTarget;

export const getFirstVisibleDayGridEventTarget =
  dayGridEventTargeting.getFirstVisibleGridEventTarget;

export const listVisibleDayGridEventTargets =
  dayGridEventTargeting.listVisibleGridEventTargets;

export const focusDayGridEventTarget =
  dayGridEventTargeting.focusGridEventTarget;
