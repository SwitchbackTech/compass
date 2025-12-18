import { EventEmitter2 } from "eventemitter2";
import { BehaviorSubject, Subject } from "rxjs";
import { StringV4Schema } from "@core/types/type.utils";

export interface KeyCombination {
  event: KeyboardEvent;
  sequence: string[];
}

export interface DomMovement {
  event: MouseEvent | TouchEvent;
  x: number;
  y: number;
  mousedown: boolean;
  element: Element | null;
  selectionStart: Pick<MouseEvent, "clientX" | "clientY"> | null;
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

export const keyPressed = new BehaviorSubject<KeyCombination | null>(null);

export const keyReleased = new Subject<KeyCombination>();

export const domMovement = new Subject<DomMovement>();

export const mouseDown$ = new BehaviorSubject<boolean>(false);

export function globalOnKeyPressHandler(e: KeyboardEvent) {
  const { event, sequence = [] } = keyPressed.getValue() ?? {};
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
    keyPressed.next({ event: e, sequence: reset ? [e.key] : nextSequence });
  } else {
    keyPressed.next({ event: e, sequence: [e.key] });
  }
}

export function globalOnKeyUpHandler(e: KeyboardEvent) {
  const { event, sequence = [] } = keyPressed.getValue() ?? {};

  if (event) {
    const firstKeyInSequence = sequence[0];
    const releasedKey = StringV4Schema.safeParse(e.key).data;
    const firstKeyReleased = releasedKey === firstKeyInSequence;

    if (firstKeyReleased) keyPressed.next(null);
  }

  keyReleased.next({ event: e, sequence });
}

export function getElementAtPoint({
  clientX,
  clientY,
}: Pick<MouseEvent, "clientX" | "clientY">): Element | null {
  const element = document.elementFromPoint(clientX, clientY);

  return element;
}

function checkMouseDown(
  event: Pick<MouseEvent | TouchEvent, "target" | "type"> &
    Pick<MouseEvent, "clientX" | "clientY">,
): {
  mousedown: boolean;
  selectionStart: Pick<MouseEvent, "clientX" | "clientY"> | null;
} {
  const isMousedownEvent = event.type === "mousedown";
  const isMouseupEvent = event.type === "mouseup";
  const { clientX, clientY } = event;

  if (isMousedownEvent) mouseDown$.next(true);
  if (isMouseupEvent) mouseDown$.next(false);

  const mousedown = mouseDown$.getValue();
  const selectionStart = mousedown ? { clientX, clientY } : null;

  return { mousedown, selectionStart };
}

function processMovement(
  e: Pick<MouseEvent, "clientX" | "clientY" | "target" | "type">,
) {
  const mousedown = checkMouseDown(e);
  const elem = getElementAtPoint(e);
  const element = elem ?? (e.target instanceof Element ? e.target : null);

  const x = e.clientX;
  const y = e.clientY;

  return { x, y, element, ...mousedown };
}

function processMouseEvent(event: MouseEvent): DomMovement {
  const movement = processMovement(event);

  return { event, ...movement };
}

function processTouchEvent(event: TouchEvent): DomMovement {
  const clientX = event.changedTouches[0]?.clientX ?? 0;
  const clientY = event.changedTouches[0]?.clientY ?? 0;
  const type = event.type;
  const target = event.target;
  const movement = processMovement({ type, target, clientX, clientY });

  return { event, ...movement };
}

export function globalMovementHandler(e: MouseEvent | TouchEvent) {
  const isMouseEvent = e instanceof MouseEvent;
  const movement = isMouseEvent ? processMouseEvent(e) : processTouchEvent(e);

  domMovement.next(movement);
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
