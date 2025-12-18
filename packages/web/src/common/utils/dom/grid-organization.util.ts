import { CSSProperties } from "react";
import { BehaviorSubject } from "rxjs";
import {
  CLASS_TIMED_CALENDAR_EVENT,
  DATA_EVENT_ELEMENT_ID,
} from "@web/common/constants/web.constants";
import { theme } from "@web/common/styles/theme";

interface Placement {
  isOverlapping: boolean;
  style: CSSProperties;
}

interface GridData extends Placement {
  order: number;
}

export const gridOrganization$ = new BehaviorSubject<Record<string, GridData>>(
  {},
);

export const maxGridZIndex$ = new BehaviorSubject<number>(0);

const borderRingSpace = 2;
const themeSpacing = parseInt(theme.spacing.s);
const canvas = document.createElement("canvas");
const canvasContext = canvas.getContext("2d");
const selector = `.${CLASS_TIMED_CALENDAR_EVENT}`;
const defaultGridData: GridData = { isOverlapping: false, style: {}, order: 0 };

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
  if (
    rectA.y + rectA.height - borderRingSpace <= rectB.y ||
    rectB.y + rectB.height - borderRingSpace <= rectA.y
  ) {
    return false; // No collision
  }

  // If no non-overlap conditions are met, then there is a collision
  return true;
};

export const isTimedEventNode = (node: Element): boolean =>
  node.classList.contains(CLASS_TIMED_CALENDAR_EVENT);

export const getNodeId = (node: HTMLElement): string | null => {
  return node.getAttribute(DATA_EVENT_ELEMENT_ID);
};

export const getOrder = (node: HTMLElement): number => {
  const id = getNodeId(node);
  const gridOrganization = gridOrganization$.getValue();

  if (!id) return 0;

  return gridOrganization[id]?.order ?? 0;
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
): Placement => {
  const width = `${_width}px`;
  const collisionLength = collidingNodes.length;
  const isOverlapping = collisionLength > 0;
  const marginTop = `${borderRingSpace}px`;

  if (!isOverlapping) {
    return { isOverlapping, style: { marginTop, left: marginTop, width } };
  }

  const totalNodes = collisionLength + 1;
  const nodes = [node, ...collidingNodes];
  const orders = [...nodes].sort(sortByOrderAndWidthAttribute);
  const zOrder = [...nodes].sort((a, b) => b.offsetHeight - a.offsetHeight);
  const index = orders.indexOf(node);
  const _zIndex = zOrder.indexOf(node) + index;
  const zIndex = _zIndex.toString();
  const columns = containerWidth / totalNodes;
  const offset = columns * index + borderRingSpace;
  const adjustedWidth = offset + _width;
  const overflow = Math.max(0, adjustedWidth - containerWidth);
  const left = offset - overflow;

  return {
    isOverlapping,
    style: { marginTop, left: `${left}px`, width, zIndex },
  };
};

export function processNode(
  node: HTMLElement,
  nodes: HTMLElement[],
  gridRect: DOMRect,
): Placement {
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

function resetPlacements(nodes: HTMLElement[]) {
  nodes.forEach((node, index) => {
    resetPosition(node);

    const id = getNodeId(node);
    const gridOrganization = gridOrganization$.getValue();

    if (id) {
      gridOrganization$.next({
        ...gridOrganization,
        [id]: { ...defaultGridData, order: index },
      });
    }
  });
}

function updatePlacements(
  nodes: HTMLElement[],
  placements: Placement[],
  maxZIndex: number,
): Record<string, GridData> {
  const organization: Record<string, GridData> = {};

  placements.forEach((placement, index) => {
    const node = nodes[index];
    const id = getNodeId(node);

    if (!id) return;

    organization[id] = { ...placement, order: index };

    const { zIndex, ...styles } = placement.style;
    // overlaps should typically not exceed 10 events.
    // support for up to 100 z-index overlap classes has been added in index.css
    const zClass = `z-${zIndex ?? 0}`;
    const zMaxClass = `z-${maxZIndex}`;
    const classLists = Array.from(node.classList.values());
    const overlapClasses = ["border", "shadow-md"];
    const newClasses = [zClass, `hover:${zMaxClass}`, `focus:${zMaxClass}`];
    const oldClasses = classLists.filter((cls) => cls.includes("z-"));

    oldClasses.push(...overlapClasses);

    if (placement.isOverlapping) newClasses.push(...overlapClasses);

    // Mutate DOM classes+styles here to prevent react re-renders
    node.classList.remove(...oldClasses);
    node.classList.add(...newClasses);
    Object.assign(node.style, styles);
  });

  return organization;
}

export function reorderGrid(mainGrid: HTMLElement) {
  const gridRect = mainGrid.getBoundingClientRect();
  const nodes = Array.from(mainGrid.querySelectorAll<HTMLElement>(selector));

  resetPlacements(nodes);

  const zIndexes = [0];

  // calculate placements without mutating the DOM first
  const placements = nodes.map((node) => {
    const placement = processNode(
      node,
      nodes.filter((n) => !n.isEqualNode(node)),
      gridRect,
    );

    const zIndex = placement.style.zIndex?.toString() || "0";

    zIndexes.push(parseInt(zIndex, 10));

    return placement;
  });

  const maxZIndex = Math.max(...zIndexes) + 1;

  maxGridZIndex$.next(maxZIndex);

  const organization = updatePlacements(nodes, placements, maxZIndex);

  gridOrganization$.next(organization);
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

export const gridObserver = new MutationObserver(observeGridEvents);
