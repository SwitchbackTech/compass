import { EventEmitter2 } from "eventemitter2";
import { BehaviorSubject, Subject } from "rxjs";
import { StringV4Schema } from "@core/types/type.utils";

export interface KeyCombination {
  event: KeyboardEvent;
  sequence: string[];
}

export enum CompassDOMEvents {
  FOCUS_TASK_DESCRIPTION = "FOCUS_TASK_DESCRIPTION",
  SAVE_TASK_DESCRIPTION = "SAVE_TASK_DESCRIPTION",
}

export const compassEventEmitter = new EventEmitter2({
  wildcard: false,
  maxListeners: Number.MAX_SAFE_INTEGER,
  verboseMemoryLeak: true,
});

export const keyPressed = new BehaviorSubject<KeyCombination | null>(null);

export const keyReleased = new Subject<KeyCombination>();

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
    const meta = sequence[0];
    const key = StringV4Schema.safeParse(e.key).data;

    if (key === meta) keyPressed.next(null);
  }

  keyReleased.next({ event: e, sequence });
}

export function pressKey(
  key: string,
  {
    keyUpInit = {},
    keyDownInit = {},
  }: { keyUpInit?: KeyboardEventInit; keyDownInit?: KeyboardEventInit } = {},
) {
  window.dispatchEvent(
    new KeyboardEvent("keydown", { ...keyDownInit, key, composed: true }),
  );
  window.dispatchEvent(
    new KeyboardEvent("keyup", { ...keyUpInit, key, composed: true }),
  );
}
