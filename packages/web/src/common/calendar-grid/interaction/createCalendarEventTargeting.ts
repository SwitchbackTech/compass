import {
  type CalendarEventRegistry,
  type CalendarInteractionRegisteredTarget,
} from "./createCalendarEventRegistry";

export type CalendarEventTarget<TType extends string> =
  CalendarInteractionRegisteredTarget<TType>;

export const createCalendarEventTargeting = <TType extends string>({
  registry,
  targetSelector,
}: {
  registry: CalendarEventRegistry<TType>;
  targetSelector: string;
}) => {
  let hoveredCalendarEventElement: HTMLElement | null = null;

  const toTarget = (
    element: Element | null,
  ): CalendarEventTarget<TType> | null => {
    if (!(element instanceof HTMLElement)) return null;

    const target = registry.resolveFromTarget(element);
    if (!target) return null;

    return {
      element: target.element,
      eventId: target.eventId,
      eventType: target.eventType,
    };
  };

  return {
    clearHoveredCalendarEventTarget: (element?: HTMLElement): void => {
      if (!element || hoveredCalendarEventElement === element) {
        hoveredCalendarEventElement = null;
      }
    },
    focusCalendarEventTarget: (target: CalendarEventTarget<TType>): void => {
      target.element.focus();
    },
    getFirstVisibleCalendarEventTarget: (
      root: ParentNode = document,
    ): CalendarEventTarget<TType> | null => {
      const candidates = root.querySelectorAll(targetSelector);

      for (const candidate of candidates) {
        const target = toTarget(candidate);
        if (target && isVisibleCalendarEventElement(target.element)) {
          return target;
        }
      }

      return null;
    },
    getFocusedCalendarEventTarget: (): CalendarEventTarget<TType> | null =>
      toTarget(document.activeElement),
    getHoveredCalendarEventTarget: (): CalendarEventTarget<TType> | null =>
      toTarget(hoveredCalendarEventElement),
    setHoveredCalendarEventTarget: (element: HTMLElement | null): void => {
      hoveredCalendarEventElement = element;
    },
  };
};

const isVisibleCalendarEventElement = (element: HTMLElement): boolean => {
  if (element.hidden || element.getAttribute("aria-hidden") === "true") {
    return false;
  }

  return element.offsetParent !== null || element.getClientRects().length > 0;
};
