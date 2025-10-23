import { Schema_Event } from "@core/types/event.types";

/**
 * Focuses an event element by its ID and scrolls it into view
 */
function focusEventById(eventId: string): void {
  const element = document.querySelector(
    `[data-event-id="${eventId}"]`,
  ) as HTMLElement;
  if (element) {
    element.focus();
    element.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

/**
 * Focuses the first relevant agenda event based on current time
 * Priority order:
 * 1. First all-day event (if any exist)
 * 2. Current timed event (happening now)
 * 3. Next future timed event
 * 4. First timed event (fallback for past events)
 */
export function focusFirstAgendaEvent(events: Schema_Event[]): void {
  if (events.length === 0) {
    return;
  }

  // Separate all-day and timed events
  const allDayEvents = events.filter((event) => event.isAllDay);
  const timedEvents = events
    .filter((event) => !event.isAllDay)
    .sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );

  // Priority 1: All-day events
  if (allDayEvents.length > 0) {
    focusEventById(allDayEvents[0]._id);
    return;
  }

  // Priority 2: Current event (happening now)
  const now = new Date();
  const currentEvent = timedEvents.find((event) => {
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);
    return startDate <= now && now < endDate;
  });

  if (currentEvent) {
    focusEventById(currentEvent._id);
    return;
  }

  // Priority 3: Next future event
  const nextEvent = timedEvents.find((event) => {
    const startDate = new Date(event.startDate);
    return startDate > now;
  });

  if (nextEvent) {
    focusEventById(nextEvent._id);
    return;
  }

  // Priority 4: First timed event (fallback for past events)
  if (timedEvents.length > 0) {
    focusEventById(timedEvents[0]._id);
  }
}
