import { EventEmitter2 } from "eventemitter2";
import { PointerEvent } from "react";
import { BehaviorSubject, Subject } from "rxjs";
import { StringV4Schema } from "@core/types/type.utils";
import { isLeftClick } from "../mouse/mouse.util";

export interface KeyCombination {
  event: KeyboardEvent;
  sequence: string[];
}

export interface DomMovement {
  event: PointerEvent;
  x: number;
  y: number;
  pointerdown: boolean;
  element: Element | null;
  selectionStart: Pick<PointerEvent, "clientX" | "clientY"> | null;
}

export enum CompassDOMEvents {
  FOCUS_TASK_DESCRIPTION = "FOCUS_TASK_DESCRIPTION",
  SAVE_TASK_DESCRIPTION = "SAVE_TASK_DESCRIPTION",
  SCROLL_TO_NOW_LINE = "SCROLL_TO_NOW_LINE",
}

export const compassEventEmitter = new EventEmitter2({
  wildcard: false,
  maxListeners: Number.MAX_SAFE_INTEGER,
  verboseMemoryLeak: true,
});

export const keyPressed$ = new BehaviorSubject<KeyCombination | null>(null);

export const keyReleased$ = new Subject<KeyCombination>();

export const domMovement$ = new Subject<DomMovement>();

export const pointerdown$ = new BehaviorSubject<boolean>(false);

export const selectionStart$ = new BehaviorSubject<
  DomMovement["selectionStart"]
>(null);

export function globalOnKeyPressHandler(e: KeyboardEvent) {
  const { event, sequence = [] } = keyPressed$.getValue() ?? {};
  const lastKey = sequence[sequence.length - 1];
  const repeat = e.key === lastKey || e.repeat;
  const nextSequence = repeat ? sequence : [...sequence, e.key];
  const hasMeta = nextSequence.includes("Meta");
  const hasCtrl = nextSequence.includes("Control");
  const hasAlt = nextSequence.includes("Alt");
  const hasShift = nextSequence.includes("Shift");
  const resetMeta = !e.metaKey && hasMeta;
  const resetCtrl = !e.ctrlKey && hasCtrl;
  const resetAlt = !e.altKey && hasAlt;
  const resetShift = !e.shiftKey && hasShift;
  const reset = resetMeta || resetCtrl || resetAlt || resetShift;

  if (event) {
    keyPressed$.next({ event: e, sequence: reset ? [e.key] : nextSequence });
  } else {
    keyPressed$.next({ event: e, sequence: [e.key] });
  }
}

export function globalOnKeyUpHandler(e: KeyboardEvent) {
  const { event, sequence = [] } = keyPressed$.getValue() ?? {};

  if (event) {
    const firstKeyInSequence = sequence[0];
    const releasedKey = StringV4Schema.safeParse(e.key).data;
    const firstKeyReleased = releasedKey === firstKeyInSequence;

    if (firstKeyReleased) keyPressed$.next(null);
  }

  keyReleased$.next({ event: e, sequence });
}

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
  target: Element | Node | Window | Document = window,
) {
  target.dispatchEvent(
    new KeyboardEvent("keydown", { ...keyDownInit, key, composed: true }),
  );

  target.dispatchEvent(
    new KeyboardEvent("keyup", { ...keyUpInit, key, composed: true }),
  );
}
