import { EventEmitter2 } from "eventemitter2";
import { type PointerEvent } from "react";
import { BehaviorSubject, Subject } from "rxjs";
import { isLeftClick } from "../mouse/mouse.util";

export interface DomMovement {
  event: PointerEvent;
  x: number;
  y: number;
  pointerdown: boolean;
  element: Element | null;
  selectionStart: Pick<PointerEvent, "clientX" | "clientY"> | null;
}

export enum CompassDOMEvents {
  SCROLL_TO_NOW_LINE = "SCROLL_TO_NOW_LINE",
}

export const compassEventEmitter = new EventEmitter2({
  wildcard: false,
  maxListeners: Number.MAX_SAFE_INTEGER,
  verboseMemoryLeak: true,
});

export const domMovement$ = new Subject<DomMovement>();

export const pointerdown$ = new BehaviorSubject<boolean>(false);

export const selectionStart$ = new BehaviorSubject<
  DomMovement["selectionStart"]
>(null);

export function getElementAtPoint({
  clientX,
  clientY,
}: Pick<PointerEvent, "clientX" | "clientY">): Element | null {
  const element = document.elementFromPoint(clientX, clientY);

  return element;
}

function checkPointerDown(event: PointerEvent): {
  pointerdown: boolean;
  selectionStart: DomMovement["selectionStart"];
} {
  const isPointerDownEvent = event.type === "pointerdown";
  const isPointerUpEvent = event.type === "pointerup";
  const { clientX, clientY } = event;

  // Only treat primary-button pointerdown as the start of a drag/selection.
  // This avoids incorrectly entering pointerdown state for right-clicks or
  // other non-primary button interactions (e.g. context menu).
  if (isPointerDownEvent && isLeftClick(event)) {
    pointerdown$.next(true);
    selectionStart$.next({ clientX, clientY });
  }

  if (isPointerUpEvent) {
    pointerdown$.next(false);
    selectionStart$.next(null);
  }

  const isPointerDown = pointerdown$.getValue();
  const selectionStart = selectionStart$.getValue();

  return { pointerdown: isPointerDown, selectionStart };
}

function processMovement(e: PointerEvent) {
  const pointerdown = checkPointerDown(e);
  const elem = getElementAtPoint(e);
  const element = elem ?? (e.target instanceof Element ? e.target : null);

  const x = e.clientX;
  const y = e.clientY;

  return { x, y, element, ...pointerdown };
}

export function globalMovementHandler(event: PointerEvent) {
  const movement = processMovement(event);

  domMovement$.next({ event, ...movement });
}

export function pressKey(
  key: string,
  {
    keyUpInit = {},
    keyDownInit = {},
  }: { keyUpInit?: KeyboardEventInit; keyDownInit?: KeyboardEventInit } = {},
  target: Element | Node | Window | Document = document,
) {
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      composed: true,
      ...keyDownInit,
      key,
    }),
  );

  target.dispatchEvent(
    new KeyboardEvent("keyup", {
      bubbles: true,
      cancelable: true,
      composed: true,
      ...keyUpInit,
      key,
    }),
  );
}
