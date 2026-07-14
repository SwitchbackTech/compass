import {
  focusDayCalendarEventTarget,
  getFirstVisibleDayCalendarEventTarget,
} from "@web/views/Day/interaction/targeting/dayCalendarEventTargeting";

export function focusFirstDayCalendarEvent() {
  const target = getFirstVisibleDayCalendarEventTarget();

  if (!target) {
    return;
  }

  target.element.scrollIntoView({ block: "nearest" });
  focusDayCalendarEventTarget(target);
}
