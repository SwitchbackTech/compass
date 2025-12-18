import { useEffect, useState } from "react";
import { BehaviorSubject, Observable, distinctUntilChanged, share } from "rxjs";
import { Placement, Strategy } from "@floating-ui/react";

export enum CursorItem {
  EventForm = "EventForm",
  EventPreview = "EventPreview",
  EventContextMenu = "EventContextMenu",
}

const nodeId$ = new BehaviorSubject<CursorItem | null>(null);
const placement$ = new BehaviorSubject<Placement>("right-start");
const strategy$ = new BehaviorSubject<Strategy>("absolute");
const reference$ = new BehaviorSubject<Element | null>(null);
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
  setFloatingNodeIdAtCursor(nodeId);
  setFloatingPlacementAtCursor(placement);
  setFloatingStrategyAtCursor(strategy);
  setFloatingReferenceAtCursor(reference);
}

export function closeFloatingAtCursor() {
  setFloatingNodeIdAtCursor(null);
  setFloatingPlacementAtCursor("right-start");
  setFloatingReferenceAtCursor(null);
}
