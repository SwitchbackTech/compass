/**
 * Pure decision logic for keyboard-only click suppression.
 *
 * The hook listens at window capture phase and asks this predicate whether to
 * swallow the event. The subtlety is that "block the mouse" cannot mean "block
 * every trusted event of these types": Enter/Space on a native button fires a
 * TRUSTED click (detail 0, empty pointerType), and blocking it would break
 * keyboard activation of every native button - the one thing a keyboard-only
 * app depends on. Synthetic .click() calls (react-datepicker's open path, the
 * Life view's derived clicks) are untrusted and must also pass.
 */

export const POINTER_BLOCK_EVENT_TYPES = [
  "pointerdown",
  "mousedown",
  "click",
  "auxclick",
  "dblclick",
  "contextmenu",
] as const;

export type PointerBlockEventType = (typeof POINTER_BLOCK_EVENT_TYPES)[number];

/**
 * Structural slice of the event, so unit tests can pass plain objects -
 * test environments cannot construct events with isTrusted true.
 */
export interface PointerBlockCandidate {
  type: string;
  isTrusted: boolean;
  /** Click count; 0 for keyboard-activation clicks and keyboard contextmenu. */
  detail: number;
  /** 2 for right-button contextmenu; 0 for keyboard contextmenu. */
  button: number;
  /** "mouse" | "pen" | "touch" on Chromium PointerEvent clicks; "" or absent for keyboard. */
  pointerType?: string | null;
}

/**
 * A trusted contextmenu arriving this soon after a blocked pointerdown is the
 * tail of a mouse gesture, whatever its button value claims (macOS Ctrl+click
 * and platform quirks). Keyboard Shift+F10 has no preceding pointerdown.
 */
export const CONTEXTMENU_POINTER_WINDOW_MS = 500;

/**
 * Structural event slice the listener needs. Real DOM events satisfy it;
 * tests pass plain objects because isTrusted is [LegacyUnforgeable] - it
 * cannot be faked on a dispatched event.
 */
export interface PointerBlockEvent {
  type: string;
  isTrusted: boolean;
  detail?: number;
  button?: number;
  pointerType?: string;
  target: EventTarget | null;
  preventDefault(): void;
  stopPropagation(): void;
}

/**
 * The capture-phase listener body. Owns the pointerdown timestamp used to
 * catch contextmenu events that tail a blocked mouse gesture, and pulses
 * onBlockedGesture once per gesture (pointerdown), not again on click.
 */
export const createPointerBlockListener = (options: {
  onBlockedGesture: () => void;
}) => {
  let lastBlockedPointerDownAt: number | null = null;

  return (event: PointerBlockEvent): void => {
    const target = event.target;
    if (target instanceof Element && target.closest("[data-onboarding-ui]")) {
      return;
    }

    const msSinceBlockedPointerDown =
      lastBlockedPointerDownAt === null
        ? undefined
        : performance.now() - lastBlockedPointerDownAt;
    const shouldBlock = shouldBlockPointerEvent(
      {
        type: event.type,
        isTrusted: event.isTrusted,
        detail: event.detail ?? 0,
        button: event.button ?? 0,
        pointerType: event.pointerType,
      },
      { msSinceBlockedPointerDown },
    );
    if (!shouldBlock) return;

    event.preventDefault();
    event.stopPropagation();
    if (event.type === "pointerdown") {
      lastBlockedPointerDownAt = performance.now();
      options.onBlockedGesture();
    }
  };
};

export const shouldBlockPointerEvent = (
  event: PointerBlockCandidate,
  options: { msSinceBlockedPointerDown?: number } = {},
): boolean => {
  // Synthetic events (element.click(), dispatched contextmenu) always pass.
  if (!event.isTrusted) return false;

  switch (event.type) {
    case "click": {
      const isKeyboardActivation = event.detail === 0 && !event.pointerType;
      return !isKeyboardActivation;
    }
    case "contextmenu": {
      if (event.button === 2) return true;
      const { msSinceBlockedPointerDown } = options;
      return (
        msSinceBlockedPointerDown !== undefined &&
        msSinceBlockedPointerDown <= CONTEXTMENU_POINTER_WINDOW_MS
      );
    }
    // pointerdown / mousedown / auxclick / dblclick are never keyboard-made.
    default:
      return true;
  }
};
