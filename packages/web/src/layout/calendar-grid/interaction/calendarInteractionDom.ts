import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { getTimesLabel } from "@web/common/utils/datetime/web.date.util";
import { type FloatingDraftEventMount } from "@web/interaction/CalendarInteractionAdapter";
import { createDraftEventClone } from "@web/interaction/dom/clone/createDraftEventClone";

export const CALENDAR_EVENT_RESIZE_HANDLE_ATTRIBUTE =
  "data-calendar-event-resize-handle";
export const CALENDAR_EVENT_TIME_LABEL_ATTRIBUTE =
  "data-calendar-event-time-label";
export const CALENDAR_EVENT_TIME_LABEL_SELECTOR = `[${CALENDAR_EVENT_TIME_LABEL_ATTRIBUTE}='true']`;

export type CalendarResizeEdge = "endDate" | "startDate";

export const getCalendarResizeHandleEdge = (
  event: Pick<PointerEvent, "target">,
): CalendarResizeEdge | null => {
  const pointerTarget = event.target instanceof Element ? event.target : null;
  const handle = pointerTarget?.closest<HTMLElement>(
    `[${CALENDAR_EVENT_RESIZE_HANDLE_ATTRIBUTE}]`,
  );
  const edge = handle?.getAttribute(CALENDAR_EVENT_RESIZE_HANDLE_ATTRIBUTE);

  return isCalendarResizeEdge(edge) ? edge : null;
};

export const updateCalendarDraftEventTimeLabel = (
  node: HTMLElement,
  event: Schema_GridEvent,
) => {
  if (!event.startDate || !event.endDate) {
    return;
  }

  const timeLabel = getOrCreateCalendarDraftEventTimeLabel(node);

  timeLabel.removeAttribute("aria-hidden");
  timeLabel.classList.remove("opacity-0");
  timeLabel.style.display = "block";
  timeLabel.textContent = getTimesLabel(event.startDate, event.endDate);
};

export const createCalendarInteractionDraftEventMount = ({
  source,
}: {
  source: HTMLElement;
}): FloatingDraftEventMount => {
  const rect = source.getBoundingClientRect();
  const clone = createDraftEventClone(source);

  for (const element of [clone, ...clone.querySelectorAll<HTMLElement>("*")]) {
    element.removeAttribute("data-day-interaction-event-id");
    element.removeAttribute("data-day-interaction-event-type");
    element.removeAttribute("data-week-interaction-event-id");
    element.removeAttribute("data-week-interaction-event-type");
    element.style.animation = "none";
    element.style.transition = "none";
  }

  return {
    clone,
    rect: {
      height: rect.height,
      left: rect.left,
      top: rect.top,
      width: rect.width,
    },
  };
};

const getOrCreateCalendarDraftEventTimeLabel = (node: HTMLElement) => {
  const existing = node.querySelector<HTMLElement>(
    CALENDAR_EVENT_TIME_LABEL_SELECTOR,
  );

  if (existing) {
    return existing;
  }

  const label = document.createElement("span");

  label.setAttribute(CALENDAR_EVENT_TIME_LABEL_ATTRIBUTE, "true");
  label.style.fontSize = "0.563rem";
  label.style.position = "relative";
  label.style.zIndex = "3";

  const parent = getDraftEventTimeLabelParent(node);
  const resizeHandle = getFirstDirectResizeHandle(parent);

  parent.insertBefore(label, resizeHandle);

  return label;
};

const getDraftEventTimeLabelParent = (node: HTMLElement) => {
  const firstChild = node.firstElementChild;

  if (firstChild instanceof HTMLElement && firstChild.tagName !== "SPAN") {
    return firstChild;
  }

  return node;
};

const getFirstDirectResizeHandle = (node: HTMLElement) => {
  for (const child of node.children) {
    if (
      child instanceof HTMLElement &&
      child.hasAttribute(CALENDAR_EVENT_RESIZE_HANDLE_ATTRIBUTE)
    ) {
      return child;
    }
  }

  return null;
};

const isCalendarResizeEdge = (
  edge: string | null | undefined,
): edge is CalendarResizeEdge => edge === "startDate" || edge === "endDate";
