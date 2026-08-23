import { dayEventTargeting } from "@web/views/Day/interaction/registry/day-event.registry";

export function focusFirstDayCalendarEvent() {
  const target = dayEventTargeting.getFirstNavigableGridEventTarget();

  if (!target) {
    return;
  }

  target.element.scrollIntoView({ block: "nearest" });
  dayEventTargeting.focusGridEventTarget(target);
}
