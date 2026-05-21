export type CalendarEventTargetType = "all-day" | "timed";

export interface CalendarEventTarget {
  element: HTMLElement;
  eventId: string;
  eventType: CalendarEventTargetType;
}

const TARGET_SELECTOR = '[data-calendar-event-target="true"]';

export const getFocusedCalendarEventTarget = (): CalendarEventTarget | null =>
  toCalendarEventTarget(document.activeElement);

export const getHoveredCalendarEventTarget = (): CalendarEventTarget | null =>
  toCalendarEventTarget(
    document.querySelector('[data-calendar-event-hovered="true"]'),
  );

export const getFirstVisibleCalendarEventTarget = (
  root: ParentNode = document,
): CalendarEventTarget | null => {
  const candidates = Array.from(root.querySelectorAll(TARGET_SELECTOR));

  for (const candidate of candidates) {
    const target = toCalendarEventTarget(candidate);
    if (target && isVisibleCalendarEventElement(target.element)) return target;
  }

  return null;
};

export const focusCalendarEventTarget = (target: CalendarEventTarget): void => {
  target.element.focus();
};

const toCalendarEventTarget = (
  element: Element | null,
): CalendarEventTarget | null => {
  if (!(element instanceof HTMLElement)) return null;
  if (!element.matches(TARGET_SELECTOR)) return null;
  if (element.getAttribute("aria-disabled") === "true") return null;

  const eventId = element.dataset.eventId;
  const eventType = element.dataset.calendarEventType;

  if (!eventId) return null;
  if (eventType !== "all-day" && eventType !== "timed") return null;

  return { element, eventId, eventType };
};

const isVisibleCalendarEventElement = (element: HTMLElement): boolean => {
  if (element.hidden || element.getAttribute("aria-hidden") === "true") {
    return false;
  }

  return element.offsetParent !== null || element.getClientRects().length > 0;
};
