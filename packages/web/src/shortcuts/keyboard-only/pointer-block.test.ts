import {
  CONTEXTMENU_POINTER_WINDOW_MS,
  createPointerBlockListener,
  type PointerBlockCandidate,
  type PointerBlockEvent,
  shouldBlockPointerEvent,
} from "@web/shortcuts/keyboard-only/pointer-block";
import { describe, expect, it, mock } from "bun:test";

const candidate = (
  overrides: Partial<PointerBlockCandidate> & { type: string },
): PointerBlockCandidate => ({
  isTrusted: true,
  detail: 1,
  button: 0,
  pointerType: "mouse",
  ...overrides,
});

describe("shouldBlockPointerEvent", () => {
  it("passes untrusted events of every type (synthetic .click() etc.)", () => {
    for (const type of [
      "pointerdown",
      "mousedown",
      "click",
      "auxclick",
      "dblclick",
      "contextmenu",
    ]) {
      expect(
        shouldBlockPointerEvent(candidate({ type, isTrusted: false })),
      ).toBe(false);
    }
  });

  it("blocks a trusted mouse click", () => {
    expect(
      shouldBlockPointerEvent(
        candidate({ type: "click", detail: 1, pointerType: "mouse" }),
      ),
    ).toBe(true);
  });

  it("passes a keyboard-activation click (detail 0, empty pointerType)", () => {
    expect(
      shouldBlockPointerEvent(
        candidate({ type: "click", detail: 0, pointerType: "" }),
      ),
    ).toBe(false);
  });

  it("passes a keyboard-activation click when pointerType is absent (Firefox MouseEvent)", () => {
    expect(
      shouldBlockPointerEvent(
        candidate({ type: "click", detail: 0, pointerType: undefined }),
      ),
    ).toBe(false);
  });

  it("blocks a click that carries a pointerType even at detail 0", () => {
    expect(
      shouldBlockPointerEvent(
        candidate({ type: "click", detail: 0, pointerType: "mouse" }),
      ),
    ).toBe(true);
  });

  it("blocks trusted pointerdown, mousedown, auxclick, and dblclick regardless of detail", () => {
    for (const type of ["pointerdown", "mousedown", "auxclick", "dblclick"]) {
      expect(shouldBlockPointerEvent(candidate({ type, detail: 0 }))).toBe(
        true,
      );
    }
  });

  it("blocks a right-button contextmenu", () => {
    expect(
      shouldBlockPointerEvent(
        candidate({ type: "contextmenu", button: 2, detail: 0 }),
      ),
    ).toBe(true);
  });

  it("passes a keyboard contextmenu (button 0, no recent pointerdown)", () => {
    expect(
      shouldBlockPointerEvent(
        candidate({
          type: "contextmenu",
          button: 0,
          detail: 0,
          pointerType: "",
        }),
      ),
    ).toBe(false);
  });

  it("blocks a button-0 contextmenu that trails a blocked pointerdown", () => {
    expect(
      shouldBlockPointerEvent(
        candidate({ type: "contextmenu", button: 0, detail: 0 }),
        { msSinceBlockedPointerDown: 40 },
      ),
    ).toBe(true);
  });

  it("passes a button-0 contextmenu once the pointerdown window has lapsed", () => {
    expect(
      shouldBlockPointerEvent(
        candidate({ type: "contextmenu", button: 0, detail: 0 }),
        { msSinceBlockedPointerDown: CONTEXTMENU_POINTER_WINDOW_MS + 1 },
      ),
    ).toBe(false);
  });
});

// Listener tests use plain structural events because isTrusted is
// [LegacyUnforgeable] on real DOM events - dispatchEvent cannot fake it.
describe("createPointerBlockListener", () => {
  const fakeEvent = (
    overrides: Partial<PointerBlockEvent> & { type: string },
  ) => {
    const preventDefault = mock(() => {});
    const stopPropagation = mock(() => {});
    const event: PointerBlockEvent = {
      isTrusted: true,
      detail: 1,
      button: 0,
      pointerType: "mouse",
      target: null,
      preventDefault,
      stopPropagation,
      ...overrides,
    };
    return { event, preventDefault, stopPropagation };
  };

  it("blocks a trusted mouse gesture and pulses once, on pointerdown only", () => {
    const onBlockedGesture = mock(() => {});
    const listener = createPointerBlockListener({ onBlockedGesture });

    const down = fakeEvent({ type: "pointerdown", detail: 0 });
    const click = fakeEvent({ type: "click", detail: 1 });
    listener(down.event);
    listener(click.event);

    expect(down.preventDefault).toHaveBeenCalledTimes(1);
    expect(click.preventDefault).toHaveBeenCalledTimes(1);
    expect(onBlockedGesture).toHaveBeenCalledTimes(1);
  });

  it("passes keyboard-activation clicks untouched", () => {
    const listener = createPointerBlockListener({ onBlockedGesture: () => {} });

    const click = fakeEvent({ type: "click", detail: 0, pointerType: "" });
    listener(click.event);

    expect(click.preventDefault).not.toHaveBeenCalled();
    expect(click.stopPropagation).not.toHaveBeenCalled();
  });

  it("exempts targets inside [data-onboarding-ui]", () => {
    const tour = document.createElement("div");
    tour.setAttribute("data-onboarding-ui", "");
    const button = document.createElement("button");
    tour.appendChild(button);
    document.body.appendChild(tour);

    const onBlockedGesture = mock(() => {});
    const listener = createPointerBlockListener({ onBlockedGesture });
    const down = fakeEvent({ type: "pointerdown", target: button });
    listener(down.event);

    expect(down.preventDefault).not.toHaveBeenCalled();
    expect(onBlockedGesture).not.toHaveBeenCalled();
    tour.remove();
  });

  it("blocks a button-0 contextmenu that tails a blocked pointerdown, then passes a later keyboard one", () => {
    const listener = createPointerBlockListener({ onBlockedGesture: () => {} });

    // Standalone keyboard contextmenu: passes.
    const keyboardMenu = fakeEvent({
      type: "contextmenu",
      button: 0,
      detail: 0,
      pointerType: "",
    });
    listener(keyboardMenu.event);
    expect(keyboardMenu.preventDefault).not.toHaveBeenCalled();

    // Same shape immediately after a blocked pointerdown: mouse gesture tail.
    listener(fakeEvent({ type: "pointerdown" }).event);
    const gestureMenu = fakeEvent({
      type: "contextmenu",
      button: 0,
      detail: 0,
      pointerType: "",
    });
    listener(gestureMenu.event);
    expect(gestureMenu.preventDefault).toHaveBeenCalledTimes(1);
  });
});
