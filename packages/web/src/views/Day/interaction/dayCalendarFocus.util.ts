import {
  DATA_CALENDAR_TIMED_GRID_ROW,
  ID_GRID_COLUMNS_TIMED,
  ID_GRID_MAIN,
} from "@web/common/constants/web.constants";
import {
  focusDayCalendarEventTarget,
  getFirstVisibleDayCalendarEventTarget,
  getFocusedDayCalendarEventTarget,
  getHoveredDayCalendarEventTarget,
} from "@web/views/Day/interaction/targeting/dayCalendarEventTargeting";

export function openEventFormCreateEvent() {
  const domEvent = new MouseEvent("mousedown", {
    bubbles: true,
    button: 0,
    buttons: 1,
  });

  const calendarSurface = getTimedGridCreateTarget();

  if (!calendarSurface) return;

  calendarSurface.dispatchEvent(domEvent);
}

export const getTimedGridCreateTarget = () => {
  const timedGrid = document.getElementById(ID_GRID_MAIN);
  const timedRow = timedGrid?.querySelector<HTMLElement>(
    `[${DATA_CALENDAR_TIMED_GRID_ROW}="true"]`,
  );

  if (timedRow) {
    return timedRow;
  }

  const timedColumns = document.getElementById(ID_GRID_COLUMNS_TIMED);
  const timedRows = timedColumns?.nextElementSibling;
  const firstTimedRow = timedRows?.firstElementChild;

  if (firstTimedRow instanceof HTMLElement) {
    return firstTimedRow;
  }

  return timedGrid;
};

export function openEventFormEditEvent() {
  const target =
    getFocusedDayCalendarEventTarget() ??
    getHoveredDayCalendarEventTarget() ??
    getFirstVisibleDayCalendarEventTarget();

  if (!target) {
    return;
  }

  target.element.scrollIntoView({ block: "nearest" });
  focusDayCalendarEventTarget(target);
  target.element.dispatchEvent(
    new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "Enter",
    }),
  );
}

export function focusFirstDayCalendarEvent() {
  const target = getFirstVisibleDayCalendarEventTarget();

  if (!target) {
    return;
  }

  target.element.scrollIntoView({ block: "nearest" });
  focusDayCalendarEventTarget(target);
}
