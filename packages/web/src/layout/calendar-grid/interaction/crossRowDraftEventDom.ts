import { CALENDAR_EVENT_TIME_LABEL_SELECTOR } from "./calendarInteractionDom";

/**
 * Drops the time label off a ghost that is over the all-day row. The label is
 * added lazily by updateCalendarDraftEventTimeLabel and then persists on the
 * clone, so a timed event dragged up into the all-day row would otherwise keep
 * showing the times it is about to lose.
 */
export const hideCalendarDraftEventTimeLabel = (node: HTMLElement) => {
  const label = node.querySelector<HTMLElement>(
    CALENDAR_EVENT_TIME_LABEL_SELECTOR,
  );

  if (label) {
    label.style.display = "none";
  }
};
