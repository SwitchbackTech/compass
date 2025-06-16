import { SyntheticEvent } from "react";

/**
 * onEventTargetVisibility
 * Monitors the visibility of an event target
 * and executes a callback when the visibility changes.
 * See this link for additional context: https://github.com/SwitchbackTech/compass/pull/520#discussion_r2148965613
 * @param callback
 * @param visible execute the callback when the target is hidden or visible
 * @param visible defaults to false
 * @returns
 */
export const onEventTargetVisibility =
  (callback: () => void, visible = false) =>
  <Element extends HTMLElement, Event>(
    event: SyntheticEvent<Element, Event>,
  ) => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting !== visible) return;

      observer.disconnect();
      callback();
    });

    observer.observe(event.currentTarget);
  };
