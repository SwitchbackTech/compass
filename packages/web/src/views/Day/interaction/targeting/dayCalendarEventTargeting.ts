import {
  createCalendarEventTargeting,
  type CalendarEventTarget as SharedCalendarEventTarget,
} from "@web/layout/calendar-grid/interaction/createCalendarEventTargeting";
import {
  DAY_INTERACTION_EVENT_ID_ATTRIBUTE,
  DAY_INTERACTION_EVENT_TYPE_ATTRIBUTE,
  type DayInteractionEventType,
  dayCalendarEventRegistry,
} from "@web/views/Day/interaction/registry/dayCalendarEventRegistry";

export type DayCalendarEventTarget =
  SharedCalendarEventTarget<DayInteractionEventType>;

const TARGET_SELECTOR = `[${DAY_INTERACTION_EVENT_ID_ATTRIBUTE}][${DAY_INTERACTION_EVENT_TYPE_ATTRIBUTE}]`;

const dayCalendarEventTargeting =
  createCalendarEventTargeting<DayInteractionEventType>({
    registry: dayCalendarEventRegistry,
    targetSelector: TARGET_SELECTOR,
  });

export const setHoveredDayCalendarEventTarget =
  dayCalendarEventTargeting.setHoveredCalendarEventTarget;

export const clearHoveredDayCalendarEventTarget =
  dayCalendarEventTargeting.clearHoveredCalendarEventTarget;

export const getFocusedDayCalendarEventTarget =
  dayCalendarEventTargeting.getFocusedCalendarEventTarget;

export const getHoveredDayCalendarEventTarget =
  dayCalendarEventTargeting.getHoveredCalendarEventTarget;

export const getFirstVisibleDayCalendarEventTarget =
  dayCalendarEventTargeting.getFirstVisibleCalendarEventTarget;

export const focusDayCalendarEventTarget =
  dayCalendarEventTargeting.focusCalendarEventTarget;
