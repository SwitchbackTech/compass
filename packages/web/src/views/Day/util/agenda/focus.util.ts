import {
  CLASS_ALL_DAY_CALENDAR_EVENT,
  CLASS_MONTH_SOMEDAY_EVENT,
  CLASS_TIMED_CALENDAR_EVENT,
  CLASS_WEEK_SOMEDAY_EVENT,
  DATA_EVENT_ELEMENT_ID,
  ID_GRID_ALLDAY_ROW,
  ID_GRID_MAIN,
} from "@web/common/constants/web.constants";
import {
  getElementAtPointer,
  isOverAllDayRow,
  isOverMainGrid,
  isOverSomedayMonth,
  isOverSomedayWeek,
} from "@web/common/context/pointer-position";

export function focusElement(element: HTMLElement): void {
  element.scrollIntoView({ behavior: "smooth", block: "start" });
  element.focus({ preventScroll: true });
}

export function getElementMidFocalPoint(
  event: HTMLElement,
): Pick<MouseEvent, "clientX" | "clientY"> {
  const { top, left, width, height } = event.getBoundingClientRect();
  const clientX = left + width / 2;
  const clientY = top + height / 2;

  return { clientX, clientY };
}

export function getEventClass(element: Element | null) {
  switch (true) {
    case isOverSomedayWeek(element):
      return CLASS_WEEK_SOMEDAY_EVENT;
    case isOverSomedayMonth(element):
      return CLASS_MONTH_SOMEDAY_EVENT;
    case isOverAllDayRow(element):
      return CLASS_ALL_DAY_CALENDAR_EVENT;
    case isOverMainGrid(element):
      return CLASS_TIMED_CALENDAR_EVENT;
    default:
      return null;
  }
}

export function getFirstAgendaEvent(): HTMLElement | null {
  const cursorElement = getElementAtPointer();
  const overMainGrid = isOverMainGrid(cursorElement);
  const overAllDayRow = isOverAllDayRow(cursorElement);
  const isOutsideGrid = !overMainGrid && !overAllDayRow;
  const allDaySelector = `.${CLASS_ALL_DAY_CALENDAR_EVENT}`;
  const allDayGrid = document.getElementById(ID_GRID_ALLDAY_ROW);
  const allDayEvent = allDayGrid?.querySelector<HTMLElement>(allDaySelector);
  const allDayEventId = allDayEvent?.getAttribute(DATA_EVENT_ELEMENT_ID);

  if (isOutsideGrid && allDayEventId && allDayEvent) return allDayEvent;
  if (overAllDayRow && allDayEventId && allDayEvent) return allDayEvent;

  const mainGrid = document.getElementById(ID_GRID_MAIN);
  const timedEventSelector = `.${CLASS_TIMED_CALENDAR_EVENT}`;
  const timedEvent = mainGrid?.querySelector<HTMLElement>(timedEventSelector);
  const timedEventId = timedEvent?.getAttribute(DATA_EVENT_ELEMENT_ID);

  if (overMainGrid && timedEventId && timedEvent) return timedEvent;

  return allDayEvent ?? timedEvent ?? null;
}

export function focusFirstAgendaEvent(): void {
  const event = getFirstAgendaEvent();

  if (!event) return;

  focusElement(event);
}

export function getActiveEvent(): HTMLElement | null {
  const active = document.activeElement;

  if (!active) return null;

  const eventId = active.getAttribute(DATA_EVENT_ELEMENT_ID);

  return eventId && active instanceof HTMLElement ? active : null;
}

export function getEventAtCursor(): HTMLElement | null {
  const element = getElementAtPointer();
  const eventClass = getEventClass(element);
  const event = element?.closest(`.${eventClass}`);

  if (!event) return null;

  const eventId = event.getAttribute(DATA_EVENT_ELEMENT_ID);

  return eventId && event instanceof HTMLElement ? event : null;
}

export function getFocusedEvent(): HTMLElement | null {
  return getActiveEvent() ?? getEventAtCursor() ?? getFirstAgendaEvent();
}
