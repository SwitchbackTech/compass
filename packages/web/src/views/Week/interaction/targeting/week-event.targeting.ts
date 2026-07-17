import {
  createGridEventTargeting,
  type GridEventTarget as SharedGridEventTarget,
} from "@web/grid/interaction/event.targeting";
import {
  WEEK_INTERACTION_EVENT_ID_ATTRIBUTE,
  WEEK_INTERACTION_EVENT_TYPE_ATTRIBUTE,
  type WeekInteractionEventType,
  weekEventRegistry,
} from "@web/views/Week/interaction/registry/week-event.registry";

export type GridEventTargetType = WeekInteractionEventType;

export type GridEventTarget = SharedGridEventTarget<GridEventTargetType>;

const TARGET_SELECTOR = `[${WEEK_INTERACTION_EVENT_ID_ATTRIBUTE}][${WEEK_INTERACTION_EVENT_TYPE_ATTRIBUTE}]`;

const weekGridEventTargeting = createGridEventTargeting<GridEventTargetType>({
  registry: weekEventRegistry,
  targetSelector: TARGET_SELECTOR,
});

export const setHoveredGridEventTarget =
  weekGridEventTargeting.setHoveredGridEventTarget;

export const clearHoveredGridEventTarget =
  weekGridEventTargeting.clearHoveredGridEventTarget;

export const getFocusedGridEventTarget =
  weekGridEventTargeting.getFocusedGridEventTarget;

export const getHoveredGridEventTarget =
  weekGridEventTargeting.getHoveredGridEventTarget;

export const getFirstVisibleGridEventTarget =
  weekGridEventTargeting.getFirstVisibleGridEventTarget;

export const focusGridEventTarget = weekGridEventTargeting.focusGridEventTarget;
