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

export type WeekGridEventTargetType = WeekInteractionEventType;

export type WeekGridEventTarget =
  SharedGridEventTarget<WeekGridEventTargetType>;

const TARGET_SELECTOR = `[${WEEK_INTERACTION_EVENT_ID_ATTRIBUTE}][${WEEK_INTERACTION_EVENT_TYPE_ATTRIBUTE}]`;

const weekGridEventTargeting =
  createGridEventTargeting<WeekGridEventTargetType>({
    registry: weekEventRegistry,
    targetSelector: TARGET_SELECTOR,
  });

export const setHoveredWeekGridEventTarget =
  weekGridEventTargeting.setHoveredGridEventTarget;

export const clearHoveredWeekGridEventTarget =
  weekGridEventTargeting.clearHoveredGridEventTarget;

export const getFocusedWeekGridEventTarget =
  weekGridEventTargeting.getFocusedGridEventTarget;

export const getHoveredWeekGridEventTarget =
  weekGridEventTargeting.getHoveredGridEventTarget;

export const getFirstVisibleWeekGridEventTarget =
  weekGridEventTargeting.getFirstVisibleGridEventTarget;

export const listVisibleWeekGridEventTargets =
  weekGridEventTargeting.listVisibleGridEventTargets;

export const focusWeekGridEventTarget =
  weekGridEventTargeting.focusGridEventTarget;
