import {
  focusDayGridEventTarget,
  getFirstVisibleDayGridEventTarget,
} from "@web/views/Day/interaction/targeting/day-event.targeting";

/** Set when ArrowLeft/Right pages the day; consumed once events for the new day paint. */
let pendingFocusFirstDayEvent = false;

export function focusFirstDayCalendarEvent() {
  const target = getFirstVisibleDayGridEventTarget();

  if (!target) {
    return;
  }

  target.element.scrollIntoView({ block: "nearest" });
  focusDayGridEventTarget(target);
}

export function requestFocusFirstDayCalendarEvent() {
  pendingFocusFirstDayEvent = true;
}

/**
 * Focus the first visible event if a day-page Left/Right asked for it.
 * Keeps the pending flag while the destination day is still loading so a
 * later paint can retry. Clears without focusing when `allowEmpty` is true
 * (day settled with no events).
 */
export function consumePendingFocusFirstDayCalendarEvent({
  allowEmpty = false,
}: {
  allowEmpty?: boolean;
} = {}) {
  if (!pendingFocusFirstDayEvent) return;

  const target = getFirstVisibleDayGridEventTarget();
  if (!target) {
    if (allowEmpty) {
      pendingFocusFirstDayEvent = false;
    }
    return;
  }

  pendingFocusFirstDayEvent = false;
  target.element.scrollIntoView({ block: "nearest" });
  focusDayGridEventTarget(target);
}
