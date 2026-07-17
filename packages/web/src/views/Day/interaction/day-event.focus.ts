import {
  focusDayGridEventTarget,
  getFirstVisibleDayGridEventTarget,
} from "@web/views/Day/interaction/targeting/day-event.targeting";

export function focusFirstDayCalendarEvent() {
  const target = getFirstVisibleDayGridEventTarget();

  if (!target) {
    return;
  }

  target.element.scrollIntoView({ block: "nearest" });
  focusDayGridEventTarget(target);
}
