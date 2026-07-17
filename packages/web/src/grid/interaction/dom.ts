import { type GridEvent } from "@web/common/types/web.event.types";
import { getTimesLabel } from "@web/common/utils/datetime/web.date.util";
import {
  GRID_EVENT_TIME_LABEL_FONT_SIZE,
  GRID_EVENT_TIME_LABEL_OPACITY,
} from "@web/grid/grid.constants";
import { createDraftEventClone } from "@web/interaction/dom/draft-event.clone";
import { type FloatingDraftEventMount } from "@web/interaction/interaction.adapter.types";

export const EVENT_CONTENT_ATTRIBUTE = "data-calendar-event-content";
export const EVENT_CONTENT_SELECTOR = `[${EVENT_CONTENT_ATTRIBUTE}='true']`;
export const EVENT_RESIZE_HANDLE_ATTRIBUTE =
  "data-calendar-event-resize-handle";
export const EVENT_TIME_LABEL_ATTRIBUTE = "data-calendar-event-time-label";
export const EVENT_TIME_LABEL_SELECTOR = `[${EVENT_TIME_LABEL_ATTRIBUTE}='true']`;

export type ResizeEdge = "endDate" | "startDate";

export const getResizeHandleEdge = (
  event: Pick<PointerEvent, "target">,
): ResizeEdge | null => {
  const pointerTarget = event.target instanceof Element ? event.target : null;
  const handle = pointerTarget?.closest<HTMLElement>(
    `[${EVENT_RESIZE_HANDLE_ATTRIBUTE}]`,
  );
  const edge = handle?.getAttribute(EVENT_RESIZE_HANDLE_ATTRIBUTE);

  return isResizeEdge(edge) ? edge : null;
};

export const updateDraftEventTimeLabel = (
  node: HTMLElement,
  event: GridEvent,
) => {
  if (!event.startDate || !event.endDate) {
    return;
  }

  const timeLabel = getOrCreateDraftEventTimeLabel(node);

  timeLabel.removeAttribute("aria-hidden");
  timeLabel.classList.remove("opacity-0");
  timeLabel.style.display = "block";
  timeLabel.textContent = getTimesLabel(event.startDate, event.endDate);
};

/**
 * Drops the time label off a ghost that is over the all-day row. The label is
 * added lazily by updateDraftEventTimeLabel above and then persists on
 * the clone, so a timed event dragged up into the all-day row would otherwise
 * keep showing the times it is about to lose.
 */
export const hideDraftEventTimeLabel = (node: HTMLElement) => {
  const label = node.querySelector<HTMLElement>(EVENT_TIME_LABEL_SELECTOR);

  if (label) {
    label.style.display = "none";
  }
};

export const createDraftEventMount = ({
  cursor,
  source,
}: {
  cursor?: string;
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
    cursor,
    rect: {
      height: rect.height,
      left: rect.left,
      top: rect.top,
      width: rect.width,
    },
  };
};

const getOrCreateDraftEventTimeLabel = (node: HTMLElement) => {
  const existing = node.querySelector<HTMLElement>(EVENT_TIME_LABEL_SELECTOR);

  if (existing) {
    return existing;
  }

  const label = document.createElement("span");

  label.setAttribute(EVENT_TIME_LABEL_ATTRIBUTE, "true");
  label.style.fontSize = GRID_EVENT_TIME_LABEL_FONT_SIZE;
  label.style.opacity = GRID_EVENT_TIME_LABEL_OPACITY;
  label.style.whiteSpace = "nowrap";
  label.style.position = "relative";
  label.style.zIndex = "3";

  const parent = getDraftEventTimeLabelParent(node);
  const resizeHandle = getFirstDirectResizeHandle(parent);

  parent.insertBefore(label, resizeHandle);

  return label;
};

// Match on the content container explicitly. Selecting it by "first child that
// isn't a SPAN" instead lands on the calendar accent bar, a 3px-wide absolutely
// positioned div, whenever the event carries a calendar identity — which
// renders the label squished against the card's left edge.
const getDraftEventTimeLabelParent = (node: HTMLElement) =>
  node.querySelector<HTMLElement>(EVENT_CONTENT_SELECTOR) ?? node;

const getFirstDirectResizeHandle = (node: HTMLElement) => {
  for (const child of node.children) {
    if (
      child instanceof HTMLElement &&
      child.hasAttribute(EVENT_RESIZE_HANDLE_ATTRIBUTE)
    ) {
      return child;
    }
  }

  return null;
};

const isResizeEdge = (edge: string | null | undefined): edge is ResizeEdge =>
  edge === "startDate" || edge === "endDate";
