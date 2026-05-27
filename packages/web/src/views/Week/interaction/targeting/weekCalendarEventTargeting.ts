import {
  WEEK_INTERACTION_EVENT_ID_ATTRIBUTE,
  WEEK_INTERACTION_EVENT_TYPE_ATTRIBUTE,
  weekEventRegistry,
} from "@web/views/Week/interaction/registry/weekEventRegistry";

export type CalendarEventTargetType = "all-day" | "timed";

export interface CalendarEventTarget {
  element: HTMLElement;
  eventId: string;
  eventType: CalendarEventTargetType;
}

const TARGET_SELECTOR = `[${WEEK_INTERACTION_EVENT_ID_ATTRIBUTE}][${WEEK_INTERACTION_EVENT_TYPE_ATTRIBUTE}]`;

let hoveredCalendarEventElement: HTMLElement | null = null;

export const setHoveredCalendarEventTarget = (
  element: HTMLElement | null,
): void => {
  hoveredCalendarEventElement = element;
};

export const clearHoveredCalendarEventTarget = (
  element?: HTMLElement,
): void => {
  if (!element || hoveredCalendarEventElement === element) {
    hoveredCalendarEventElement = null;
  }
};

export const getFocusedCalendarEventTarget = (): CalendarEventTarget | null =>
  toCalendarEventTarget(document.activeElement);

export const getHoveredCalendarEventTarget = (): CalendarEventTarget | null =>
  toCalendarEventTarget(hoveredCalendarEventElement);

export const getFirstVisibleCalendarEventTarget = (
  root: ParentNode = document,
): CalendarEventTarget | null => {
  const candidates = root.querySelectorAll(TARGET_SELECTOR);

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

  const target = weekEventRegistry.resolveFromTarget(element);
  if (!target) return null;

  return {
    element: target.element,
    eventId: target.eventId,
    eventType: target.eventType,
  };
};

const isVisibleCalendarEventElement = (element: HTMLElement): boolean => {
  if (element.hidden || element.getAttribute("aria-hidden") === "true") {
    return false;
  }

  return element.offsetParent !== null || element.getClientRects().length > 0;
};
