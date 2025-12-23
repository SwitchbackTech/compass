import { useEffect, useState } from "react";
import { BehaviorSubject, Observable, distinctUntilChanged, share } from "rxjs";
import { Placement, Strategy } from "@floating-ui/react";

export enum CursorItem {
  EventForm = "EventForm",
  EventPreview = "EventPreview",
  EventContextMenu = "EventContextMenu",
}

export const open$ = new BehaviorSubject<boolean>(false);
export const nodeId$ = new BehaviorSubject<CursorItem | null>(null);
export const placement$ = new BehaviorSubject<Placement>("right-start");
export const strategy$ = new BehaviorSubject<Strategy>("absolute");
export const reference$ = new BehaviorSubject<Element | null>(null);

const $open = open$.pipe(distinctUntilChanged(), share());
const $nodeId = nodeId$.pipe(distinctUntilChanged(), share());
const $placement = placement$.pipe(distinctUntilChanged(), share());
const $strategy = strategy$.pipe(distinctUntilChanged(), share());
const $reference = reference$.pipe(distinctUntilChanged(), share());

function useValue<T>(
  subject: BehaviorSubject<T>,
  sharedSubject: Observable<T>,
): T {
  const [value, setValue] = useState<T>(subject.getValue());

  useEffect(() => {
    const subscription = sharedSubject.subscribe((v) => {
      setValue(v);
    });

    return () => subscription.unsubscribe();
  });

  return value;
}

export function useFloatingOpenAtCursor(): boolean {
  return useValue<boolean>(open$, $open);
}

export function useFloatingNodeIdAtCursor(): CursorItem | null {
  return useValue<CursorItem | null>(nodeId$, $nodeId);
}

export function useFloatingPlacementAtCursor(): Placement {
  return useValue<Placement>(placement$, $placement);
}

export function useFloatingStrategyAtCursor(): Strategy {
  return useValue<Strategy>(strategy$, $strategy);
}

export function useFloatingReferenceAtCursor(): Element | null {
  return useValue<Element | null>(reference$, $reference);
}

export function setFloatingOpenAtCursor(open: boolean) {
  open$.next(open);
}

export function setFloatingNodeIdAtCursor(nodeId: CursorItem | null) {
  nodeId$.next(nodeId);
}

export function setFloatingPlacementAtCursor(placement: Placement) {
  placement$.next(placement);
}

export function setFloatingStrategyAtCursor(strategy: Strategy) {
  strategy$.next(strategy);
}

export function setFloatingReferenceAtCursor(reference: Element | null) {
  reference$.next(reference);
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
  if (open$.getValue()) closeFloatingAtCursor();

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
  const eventFormOpen = nodeId$.getValue() === item;
  const openAtCursor = open$.getValue();
  const open = eventFormOpen && openAtCursor;

  return open;
}
