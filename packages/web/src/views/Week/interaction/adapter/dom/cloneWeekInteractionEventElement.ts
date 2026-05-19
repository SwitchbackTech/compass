import { type FloatingInteractionOverlayMount } from "@web/common/calendar-interaction/CalendarInteractionAdapter";
import { createInteractionClone } from "@web/common/calendar-interaction/dom/clone/createInteractionClone";

const createWeekInteractionEventClone = (source: HTMLElement) => {
  const clone = createInteractionClone(source);

  disableTransitionTree(clone);

  return clone;
};

export const createWeekInteractionEventOverlayMount = ({
  cursor,
  source,
}: {
  cursor?: string;
  source: HTMLElement;
}): FloatingInteractionOverlayMount => {
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
