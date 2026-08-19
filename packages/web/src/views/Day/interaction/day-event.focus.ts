import { dayEventTargeting } from "@web/views/Day/interaction/targeting/day-event.targeting";

export function focusFirstDayCalendarEvent() {
  const target = dayEventTargeting.getFirstVisibleGridEventTarget();

  if (!target) {
    return;
  }

  target.element.scrollIntoView({ block: "nearest" });
  dayEventTargeting.focusGridEventTarget(target);
}
