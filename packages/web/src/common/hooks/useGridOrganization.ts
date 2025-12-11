import { CSSProperties, useEffect } from "react";
import { Subject, debounceTime } from "rxjs";
import {
  CLASS_TIMED_CALENDAR_EVENT,
  DATA_EVENT_ELEMENT_ORDER,
  DATA_EVENT_ELEMENT_OVERLAPPING,
  DATA_EVENT_ELEMENT_Z_INDEX,
} from "@web/common/constants/web.constants";
import { theme } from "@web/common/styles/theme";
import { maxAgendaZIndex$ } from "@web/views/Day/util/agenda/agenda.util";

const themeSpacing = parseInt(theme.spacing.s);
const canvas = document.createElement("canvas");
const canvasContext = canvas.getContext("2d");
const selector = `.${CLASS_TIMED_CALENDAR_EVENT}`;

// Set canvas font to match 'text-xs' Tailwind class (0.75rem = 12px)
if (canvasContext) canvasContext.font = "0.75rem Rubik";

// AABB - Axis-Aligned Bounding Box.
// This function checks for collision between two rectangles.
export const checkAABBCollision = (rectA: DOMRect, rectB: DOMRect): boolean => {
  // Check if there is no overlap on the X-axis
  if (rectA.x + rectA.width <= rectB.x || rectB.x + rectB.width <= rectA.x) {
    return false; // No collision
  }

  // Check if there is no overlap on the Y-axis
  if (rectA.y + rectA.height <= rectB.y || rectB.y + rectB.height <= rectA.y) {
    return false; // No collision
  }

  // If no non-overlap conditions are met, then there is a collision
  return true;
};

export const isTimedEventNode = (node: Element): boolean =>
  node.classList.contains(CLASS_TIMED_CALENDAR_EVENT);

export const getOrder = (node: HTMLElement): number => {
  return parseInt(node.getAttribute(DATA_EVENT_ELEMENT_ORDER) || "0");
};

export const sortByOrderAndWidthAttribute = (
  a: HTMLElement,
  b: HTMLElement,
): number => b.offsetWidth + getOrder(b) - (a.offsetWidth + getOrder(a));

export const collisionDetector = (
  node: HTMLElement,
  nodes: HTMLElement[],
): HTMLElement[] => {
  const nodeRect = node.getBoundingClientRect();

  return nodes.filter((n) => {
    if (n.isEqualNode(node)) return false;

    const rect = n.getBoundingClientRect();

    return checkAABBCollision(nodeRect, rect);
  });
};

export const collisionWidth = (
  collisions: HTMLElement[],
  containerWidth: number,
  width: number,
) => {
  const hasCollisions = collisions.length > 0;
  const colliding = collisions.length + 1;
  const minWidth = containerWidth / colliding;
  const maxWidth = hasCollisions ? containerWidth / 2 : containerWidth;

  return Math.floor(Math.min(maxWidth, Math.max(minWidth, width)));
};

export const findOptimalPlacement = (
  node: HTMLElement,
  collidingNodes: HTMLElement[],
  containerWidth: number,
  _width: number,
): { isOverlapping: boolean; style: CSSProperties } => {
  const borderRingSpace = 2;
  const width = `${_width}px`;
  const collisionLength = collidingNodes.length;
  const isOverlapping = collisionLength > 0;

  if (!isOverlapping) {
    return {
      isOverlapping,
      style: {
        marginTop: `${borderRingSpace}px`,
        left: `${borderRingSpace}px`,
        width,
        zIndex: 1,
      },
    };
  }

  const totalNodes = collisionLength + 1;
  const nodes = [node, ...collidingNodes];
  const orders = [...nodes].sort(sortByOrderAndWidthAttribute);
  const zOrder = [...nodes].sort((a, b) => b.offsetHeight - a.offsetHeight);
  const index = orders.indexOf(node);
  const _zIndex = zOrder.indexOf(node) + index + 1;
  const zIndex = _zIndex.toString();
  const columns = containerWidth / totalNodes;
  const offset = columns * index + borderRingSpace;
  const adjustedWidth = offset + _width;
  const overflow = Math.max(0, adjustedWidth - containerWidth);
  const left = offset - overflow;

  return {
    isOverlapping,
    style: {
      marginTop: `${borderRingSpace}px`,
      left: `${left}px`,
      width,
      zIndex,
    },
  };
};

export function processNode(
  node: HTMLElement,
  nodes: HTMLElement[],
  gridRect: DOMRect,
): { isOverlapping: boolean; style: CSSProperties } {
  const containerWidth = gridRect.width - themeSpacing;
  const textMeasure = canvasContext?.measureText(node.innerText ?? "");
  const textWidth = textMeasure?.width ?? 0;
  const nodeWidth = textWidth + themeSpacing * 3;

  const collisions = collisionDetector(node, nodes);
  const width = collisionWidth(collisions, containerWidth, nodeWidth);
  const placement = findOptimalPlacement(
    node,
    collisions,
    containerWidth,
    width,
  );

  return placement;
}

export function resetPosition(node: HTMLElement) {
  node.style.width = "";
  node.style.left = "";
  node.style.zIndex = "";
}

export function reorderGrid(mainGrid: HTMLElement) {
  const gridRect = mainGrid.getBoundingClientRect();
  const nodes = Array.from(mainGrid.querySelectorAll<HTMLElement>(selector));

  nodes.forEach((node, index) => {
    resetPosition(node);
    node.setAttribute(DATA_EVENT_ELEMENT_ORDER, index.toString());
  });

  const placements = nodes.map((node) =>
    processNode(
      node,
      nodes.filter((n) => !n.isEqualNode(node)),
      gridRect,
    ),
  );

  let maxZIndex = 1;

  placements.forEach(({ isOverlapping, style }, index) => {
    const node = nodes[index];
    const zIndex = style.zIndex?.toString() ?? "1";

    maxZIndex = Math.max(maxZIndex, parseInt(zIndex, 10));

    node.setAttribute(DATA_EVENT_ELEMENT_Z_INDEX, zIndex.toString());
    node.setAttribute(DATA_EVENT_ELEMENT_OVERLAPPING, isOverlapping.toString());
    Object.assign(node.style, style);
  });

  maxAgendaZIndex$.next(maxZIndex);
}

function observeGridEvents(mutations: MutationRecord[]): void {
  const mainGrid = mutations[mutations.length - 1]?.target;

  if (!(mainGrid instanceof HTMLElement)) return;

  const addedNodes = mutations.flatMap((mut) => Array.from(mut.addedNodes));
  const removedNodes = mutations.flatMap((mut) => Array.from(mut.removedNodes));
  const addedHtmlNodes = addedNodes.filter((n) => n instanceof HTMLElement);
  const removedHtmlNodes = removedNodes.filter((n) => n instanceof HTMLElement);
  const added = addedHtmlNodes.filter(isTimedEventNode);
  const removed = removedHtmlNodes.filter(isTimedEventNode);
  const mutationObserved = removed.length > 0 || added.length > 0;

  if (mutationObserved) reorderGrid(mainGrid);
}

const gridObserver = new MutationObserver(observeGridEvents);

export function useGridOrganization(mainGrid: HTMLElement | null) {
  useEffect(() => {
    if (!mainGrid) return;

    const resize$ = new Subject<[ResizeObserverEntry[], ResizeObserver]>();
    const resizeObserver = new ResizeObserver((...args) => resize$.next(args));
    const resizeObserver$ = resize$.pipe(debounceTime(100));

    gridObserver.observe(mainGrid, {
      childList: true,
      attributes: false,
      characterData: false,
      subtree: false,
    });

    resizeObserver.observe(mainGrid);

    const resizeSubscription = resizeObserver$.subscribe(() =>
      reorderGrid(mainGrid),
    );

    return () => {
      gridObserver.disconnect();
      resizeObserver.unobserve(mainGrid);
      resizeSubscription.unsubscribe();
    };
  }, [mainGrid]);
}
