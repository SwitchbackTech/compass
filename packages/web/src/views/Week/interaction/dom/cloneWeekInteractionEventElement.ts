import { type CalendarInteractionOverlayMount } from "@web/common/calendar-interaction/CalendarInteractionAdapter";
import { sanitizeInteractionCloneBase } from "@web/common/calendar-interaction/dom/sanitizeInteractionCloneBase";
import { recordWeekInteractionLayoutRead } from "../WeekInteractionMetrics";

const createWeekInteractionEventClone = (source: HTMLElement) => {
  const clone = sanitizeInteractionCloneBase(source);

  disableTransitionTree(clone);

  return clone;
};

export const createWeekInteractionEventOverlayMount = ({
  cursor,
  source,
}: {
  cursor?: string;
  source: HTMLElement;
}): CalendarInteractionOverlayMount => {
  recordWeekInteractionLayoutRead();
  const rect = source.getBoundingClientRect();

  return {
    clone: createWeekInteractionEventClone(source),
    cursor,
    rect: {
      height: rect.height,
      left: rect.left,
      top: rect.top,
      width: rect.width,
    },
  };
};

const disableTransitionTree = (root: HTMLElement) => {
  for (const element of [root, ...root.querySelectorAll<HTMLElement>("*")]) {
    element.style.animation = "none";
    element.style.transition = "none";
  }
};
