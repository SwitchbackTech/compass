import { type Placement, type Strategy } from "@floating-ui/react";
import { useSyncExternalStore } from "react";
import { createExternalStore } from "@web/common/utils/external-store.util";

export enum CursorItem {
  EventForm = "EventForm",
  EventPreview = "EventPreview",
  EventContextMenu = "EventContextMenu",
}

export const openStore = createExternalStore<boolean>(false);
export const nodeIdStore = createExternalStore<CursorItem | null>(null);
export const placementStore = createExternalStore<Placement>("right-start");
export const strategyStore = createExternalStore<Strategy>("absolute");
export const referenceStore = createExternalStore<Element | null>(null);

export function useFloatingOpenAtCursor(): boolean {
  return useSyncExternalStore(openStore.subscribe, openStore.get);
}

export function useFloatingNodeIdAtCursor(): CursorItem | null {
  return useSyncExternalStore(nodeIdStore.subscribe, nodeIdStore.get);
}

export function useFloatingPlacementAtCursor(): Placement {
  return useSyncExternalStore(placementStore.subscribe, placementStore.get);
}

export function useFloatingStrategyAtCursor(): Strategy {
  return useSyncExternalStore(strategyStore.subscribe, strategyStore.get);
}

export function useFloatingReferenceAtCursor(): Element | null {
  return useSyncExternalStore(referenceStore.subscribe, referenceStore.get);
}

export function setFloatingOpenAtCursor(open: boolean) {
  openStore.set(open);
}

export function setFloatingNodeIdAtCursor(nodeId: CursorItem | null) {
  nodeIdStore.set(nodeId);
}

export function setFloatingPlacementAtCursor(placement: Placement) {
  placementStore.set(placement);
}

export function setFloatingStrategyAtCursor(strategy: Strategy) {
  strategyStore.set(strategy);
}

export function setFloatingReferenceAtCursor(reference: Element | null) {
  referenceStore.set(reference);
}

export function openFloatingAtCursor({
  nodeId,
  reference,
  placement = "right-start",
  strategy = "absolute",
}: {
  nodeId: CursorItem;
  reference: Element;
  placement?: Placement;
  strategy?: Strategy;
}) {
  if (openStore.get()) closeFloatingAtCursor();

  const timeout = setTimeout(() => {
    setFloatingNodeIdAtCursor(nodeId);
    setFloatingPlacementAtCursor(placement);
    setFloatingStrategyAtCursor(strategy);
    setFloatingReferenceAtCursor(reference);
    setFloatingOpenAtCursor(true);
    clearTimeout(timeout);
  }, 10);
}

export function closeFloatingAtCursor() {
  setFloatingNodeIdAtCursor(null);
  setFloatingPlacementAtCursor("right-start");
  setFloatingReferenceAtCursor(null);
  setFloatingOpenAtCursor(false);
}

export function isOpenAtCursor(item: CursorItem): boolean {
  const eventFormOpen = nodeIdStore.get() === item;
  const openAtCursor = openStore.get();
  const open = eventFormOpen && openAtCursor;

  return open;
}
