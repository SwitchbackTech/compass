import {
  createCalendarEventTargeting,
  type CalendarEventTarget as SharedCalendarEventTarget,
} from "@web/common/calendar-grid/interaction/createCalendarEventTargeting";
import {
  WEEK_INTERACTION_EVENT_ID_ATTRIBUTE,
  WEEK_INTERACTION_EVENT_TYPE_ATTRIBUTE,
  type WeekInteractionEventType,
  weekEventRegistry,
} from "@web/views/Week/interaction/registry/weekEventRegistry";

export type CalendarEventTargetType = WeekInteractionEventType;

export type CalendarEventTarget =
  SharedCalendarEventTarget<CalendarEventTargetType>;

const TARGET_SELECTOR = `[${WEEK_INTERACTION_EVENT_ID_ATTRIBUTE}][${WEEK_INTERACTION_EVENT_TYPE_ATTRIBUTE}]`;

const weekCalendarEventTargeting =
  createCalendarEventTargeting<CalendarEventTargetType>({
    registry: weekEventRegistry,
    targetSelector: TARGET_SELECTOR,
  });

export const setHoveredCalendarEventTarget =
  weekCalendarEventTargeting.setHoveredCalendarEventTarget;

export const clearHoveredCalendarEventTarget =
  weekCalendarEventTargeting.clearHoveredCalendarEventTarget;

export const getFocusedCalendarEventTarget =
  weekCalendarEventTargeting.getFocusedCalendarEventTarget;

export const getHoveredCalendarEventTarget =
  weekCalendarEventTargeting.getHoveredCalendarEventTarget;

export const getFirstVisibleCalendarEventTarget =
  weekCalendarEventTargeting.getFirstVisibleCalendarEventTarget;

export const focusCalendarEventTarget =
  weekCalendarEventTargeting.focusCalendarEventTarget;
