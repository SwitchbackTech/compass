import {
  type EventRegistry,
  type RegisteredEventTarget,
} from "./event.registry";

export type GridEventTarget<TType extends string> =
  RegisteredEventTarget<TType>;

export const createGridEventTargeting = <TType extends string>({
  registry,
  targetSelector,
}: {
  registry: EventRegistry<TType>;
  targetSelector: string;
}) => {
  let hoveredEventElement: HTMLElement | null = null;

  const toTarget = (element: Element | null): GridEventTarget<TType> | null => {
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
    clearHoveredGridEventTarget: (element?: HTMLElement): void => {
      if (!element || hoveredEventElement === element) {
        hoveredEventElement = null;
      }
    },
    focusGridEventTarget: (target: GridEventTarget<TType>): void => {
      target.element.focus();
    },
    getFirstVisibleGridEventTarget: (
      root: ParentNode = document,
    ): GridEventTarget<TType> | null => {
      const visible = listVisible(root);
      return visible[0] ?? null;
    },
    listVisibleGridEventTargets: (
      root: ParentNode = document,
    ): GridEventTarget<TType>[] => listVisible(root),
    getFocusedGridEventTarget: (): GridEventTarget<TType> | null =>
      toTarget(document.activeElement),
    getHoveredGridEventTarget: (): GridEventTarget<TType> | null =>
      toTarget(hoveredEventElement),
    setHoveredGridEventTarget: (element: HTMLElement | null): void => {
      hoveredEventElement = element;
    },
  };

  function listVisible(root: ParentNode): GridEventTarget<TType>[] {
    const candidates = root.querySelectorAll(targetSelector);
    const visible: GridEventTarget<TType>[] = [];

    for (const candidate of candidates) {
      const target = toTarget(candidate);
      if (target && isVisibleEventElement(target.element)) {
        visible.push(target);
      }
    }

    return visible;
  }
};

const isVisibleEventElement = (element: HTMLElement): boolean => {
  if (element.hidden || element.getAttribute("aria-hidden") === "true") {
    return false;
  }

  return element.offsetParent !== null || element.getClientRects().length > 0;
};
