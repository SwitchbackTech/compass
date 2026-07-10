import { ZIndex } from "@web/common/constants/web.constants";
import {
  type CalendarInteractionAdapter,
  type FloatingDraftEventMount,
  type SourceElementDraftEventMode,
} from "./CalendarInteractionAdapter";
import { createCalendarInteractionEngine } from "./CalendarInteractionEngine";
import { createDraftEventClone } from "./dom/clone/createDraftEventClone";
import { FloatingDraftEvent } from "./dom/draft-event/FloatingDraftEvent";
import { afterEach, describe, expect, it, mock } from "bun:test";

interface TestTarget {
  id: string;
  source: HTMLElement;
}

interface TestVisual {
  start: {
    x: number;
    y: number;
  };
  transform: {
    x: number;
    y: number;
  };
}

const makePointerEvent = (
  type: string,
  {
    pointerId = 1,
    x = 0,
    y = 0,
  }: {
    pointerId?: number;
    x?: number;
    y?: number;
  } = {},
) =>
  new PointerEvent(type, {
    clientX: x,
    clientY: y,
    pointerId,
  });

const SOURCE_ELEMENT_INTERACTION_ATTRIBUTE = "data-calendar-interaction-source";

const createHarness = ({
  scrollableAncestor,
  sourceDraftEventMode,
}: {
  scrollableAncestor?: { clientHeight: number; scrollHeight: number };
  sourceDraftEventMode?: SourceElementDraftEventMode;
} = {}) => {
  document.body.innerHTML = "";

  let now = 100;
  let nextFrameId = 1;
  const frameCallbacks = new Map<unknown, FrameRequestCallback>();
  const timerCallbacks = new Map<unknown, () => void>();
  const source = document.createElement("div");

  source.id = "source-id";
  source.setAttribute("tabindex", "0");
  source.setAttribute("aria-describedby", "description-id");
  source.style.visibility = "visible";
  source.style.height = "40px";
  source.style.width = "120px";

  let scrollContainer: HTMLDivElement | null = null;

  if (scrollableAncestor) {
    scrollContainer = document.createElement("div");
    Object.defineProperty(scrollContainer, "clientHeight", {
      configurable: true,
      value: scrollableAncestor.clientHeight,
    });
    Object.defineProperty(scrollContainer, "scrollHeight", {
      configurable: true,
      value: scrollableAncestor.scrollHeight,
    });
    document.body.append(scrollContainer);
    scrollContainer.append(source);
  } else {
    document.body.append(source);
  }

  const target = {
    id: "target-id",
    source,
  };
  const commit = mock((input: { target: TestTarget; visual: TestVisual }) => ({
    id: input.target.id,
    visual: input.visual,
  }));
  const cancel = mock();
  const adapter: CalendarInteractionAdapter<TestTarget, TestVisual, unknown> = {
    cancel,
    commit,
    createVisual: mock(({ pointerStart }) => ({
      start: pointerStart,
      transform: {
        x: 0,
        y: 0,
      },
    })),
    getDraftEventMount: mock(({ sourceElement }): FloatingDraftEventMount => {
      const clone = createDraftEventClone(sourceElement);

      return {
        clone,
        rect: {
          height: 40,
          left: 10,
          top: 20,
          width: 120,
        },
      };
    }),
    getSourceElement: mock((resolvedTarget) => resolvedTarget.source),
    ...(sourceDraftEventMode
      ? { getSourceElementDraftEventMode: mock(() => sourceDraftEventMode) }
      : {}),
    getTarget: mock(() => target),
    updateVisual: mock(({ pointer, visual }) => ({
      draftEvent: {
        transform: {
          x: pointer.x - visual.start.x,
          y: pointer.y - visual.start.y,
        },
      },
      visual: {
        ...visual,
        transform: {
          x: pointer.x - visual.start.x,
          y: pointer.y - visual.start.y,
        },
      },
    })),
  };
  const engine = createCalendarInteractionEngine({
    adapter,
    cancelFrame: (frame) => frameCallbacks.delete(frame),
    clearTimer: (timer) => timerCallbacks.delete(timer),
    now: () => now,
    requestFrame: (callback) => {
      const id = nextFrameId;

      nextFrameId += 1;
      frameCallbacks.set(id, callback);

      return id;
    },
    setTimer: (callback) => {
      const timer = Symbol("timer");

      timerCallbacks.set(timer, callback);

      return timer;
    },
  });
  const flushFrame = (timestamp = 16) => {
    const [[frameId, callback]] = frameCallbacks;

    if (!callback) {
      throw new Error("Expected a frame callback to be scheduled");
    }

    frameCallbacks.delete(frameId);
    now += 3;
    callback(timestamp);
  };
  const fireHoldTimer = () => {
    const [[timerId, callback]] = timerCallbacks;

    if (!callback) {
      throw new Error("Expected a hold timer to be scheduled");
    }

    timerCallbacks.delete(timerId);
    callback();
  };
  // After a commit the engine holds the draft event until the source element
  // reflows or this deadline fires; jsdom rects never change, so tests use
  // the deadline to reach the restored state.
  const fireCommitTeardownDeadline = () => {
    const [[timerId, callback]] = timerCallbacks;

    if (!callback) {
      throw new Error("Expected a commit teardown deadline to be scheduled");
    }

    timerCallbacks.delete(timerId);
    callback();
  };

  return {
    adapter,
    cancel,
    commit,
    engine,
    fireCommitTeardownDeadline,
    fireHoldTimer,
    flushFrame,
    frameCallbacks,
    scrollContainer,
    source,
    target,
    timerCallbacks,
  };
};

afterEach(() => {
  document.body.innerHTML = "";
});

describe("CalendarInteractionEngine", () => {
  it("keeps a pending press as a click when the pointer is released before activation", () => {
    const { commit, engine, source, target, timerCallbacks } = createHarness();

    expect(engine.handlePointerDown(makePointerEvent("pointerdown"))).toBe(
      true,
    );

    const result = engine.handlePointerUp(
      makePointerEvent("pointerup", { x: 35, y: 45 }),
    );

    expect(result).toEqual({ target, type: "click" });
    expect(commit).not.toHaveBeenCalled();
    expect(engine.getSession()).toEqual({ phase: "idle" });
    expect(engine.getMetrics()).toMatchObject({
      active: false,
      phase: "idle",
    });
    expect(source.style.visibility).toBe("visible");
    expect(timerCallbacks.size).toBe(0);
  });

  it("activates motion once the move threshold is exceeded", () => {
    const { adapter, engine, flushFrame, source } = createHarness();

    engine.handlePointerDown(makePointerEvent("pointerdown", { x: 10, y: 10 }));
    engine.handlePointerMove(makePointerEvent("pointermove", { x: 36, y: 10 }));

    expect(engine.getSession()).toMatchObject({
      activatedBy: "move",
      phase: "motion",
    });
    expect(source.style.visibility).toBe("hidden");
    expect(
      document.body.querySelector("[data-calendar-draft-event]"),
    ).toBeTruthy();

    flushFrame();

    expect(adapter.updateVisual).toHaveBeenCalledWith(
      expect.objectContaining({
        pointer: {
          x: 36,
          y: 10,
        },
      }),
    );
    expect(engine.getMetrics()).toMatchObject({
      active: true,
      phase: "motion",
      pointerMoveCount: 1,
      rafCount: 1,
      styleWritesDuringMotion: 1,
    });
  });

  it("activates motion when the hold timer fires", () => {
    const { engine, fireHoldTimer } = createHarness();

    engine.handlePointerDown(makePointerEvent("pointerdown", { x: 8, y: 12 }));
    fireHoldTimer();

    expect(engine.getSession()).toMatchObject({
      activatedBy: "hold",
      phase: "motion",
    });
    expect(engine.getMetrics()).toMatchObject({
      active: true,
      phase: "motion",
    });
  });

  it("can keep the source visible as a dimmed placeholder during motion", () => {
    const { engine, fireCommitTeardownDeadline, flushFrame, source } =
      createHarness({
        sourceDraftEventMode: "dim-source",
      });

    engine.handlePointerDown(makePointerEvent("pointerdown", { x: 10, y: 10 }));
    engine.handlePointerMove(makePointerEvent("pointermove", { x: 36, y: 10 }));

    expect(source.style.visibility).toBe("visible");
    expect(source.style.opacity).toBe("0.5");
    expect(source.style.pointerEvents).toBe("none");
    expect(source).toHaveAttribute(SOURCE_ELEMENT_INTERACTION_ATTRIBUTE);

    flushFrame();
    engine.handlePointerUp(makePointerEvent("pointerup"));
    fireCommitTeardownDeadline();

    expect(source.style.visibility).toBe("visible");
    expect(source.style.opacity).toBe("");
    expect(source.style.pointerEvents).toBe("");
    expect(source).not.toHaveAttribute(SOURCE_ELEMENT_INTERACTION_ATTRIBUTE);
  });

  it("restores only the styles changed by the source draft event mode", () => {
    const { engine, fireCommitTeardownDeadline, flushFrame, source } =
      createHarness();

    engine.handlePointerDown(makePointerEvent("pointerdown", { x: 10, y: 10 }));
    engine.handlePointerMove(makePointerEvent("pointermove", { x: 36, y: 10 }));

    source.style.opacity = "0.25";
    source.style.pointerEvents = "auto";

    flushFrame();
    engine.handlePointerUp(makePointerEvent("pointerup"));
    fireCommitTeardownDeadline();

    expect(source.style.visibility).toBe("visible");
    expect(source.style.opacity).toBe("0.25");
    expect(source.style.pointerEvents).toBe("auto");
  });

  it("commits the current visual and restores the source on pointer up", () => {
    const { commit, engine, fireCommitTeardownDeadline, flushFrame, source } =
      createHarness();

    engine.handlePointerDown(makePointerEvent("pointerdown", { x: 5, y: 5 }));
    engine.handlePointerMove(makePointerEvent("pointermove", { x: 35, y: 45 }));
    flushFrame(16);

    const result = engine.handlePointerUp(
      makePointerEvent("pointerup", { x: 35, y: 45 }),
    );

    expect(result).toMatchObject({ type: "commit" });
    expect(commit).toHaveBeenCalledWith(
      expect.objectContaining({
        visual: expect.objectContaining({
          transform: {
            x: 30,
            y: 40,
          },
        }),
      }),
    );

    fireCommitTeardownDeadline();

    expect(source.style.visibility).toBe("visible");
    expect(
      document.body.querySelector("[data-calendar-draft-event]"),
    ).toBeNull();
    expect(engine.getMetrics()).toMatchObject({
      active: false,
      phase: "commit",
    });
  });

  it("holds the draft event and source state after commit until the source reflows", () => {
    const { engine, flushFrame, frameCallbacks, source, timerCallbacks } =
      createHarness();
    const rect = { height: 0, left: 0, top: 0, width: 0 };

    source.getBoundingClientRect = () => ({ ...rect }) as DOMRect;

    engine.handlePointerDown(makePointerEvent("pointerdown", { x: 5, y: 5 }));
    engine.handlePointerMove(makePointerEvent("pointermove", { x: 35, y: 45 }));
    flushFrame(16);
    engine.handlePointerUp(makePointerEvent("pointerup", { x: 35, y: 45 }));

    // Still held: React hasn't applied the committed geometry yet.
    expect(source.style.visibility).toBe("hidden");
    expect(
      document.body.querySelector("[data-calendar-draft-event]"),
    ).toBeTruthy();

    flushFrame(32);

    expect(source.style.visibility).toBe("hidden");

    rect.top = 50;
    flushFrame(48);

    expect(source.style.visibility).toBe("visible");
    expect(
      document.body.querySelector("[data-calendar-draft-event]"),
    ).toBeNull();
    expect(frameCallbacks.size).toBe(0);
    expect(timerCallbacks.size).toBe(0);
  });

  it("restores at the deadline when the committed geometry never changes", () => {
    const {
      engine,
      fireCommitTeardownDeadline,
      flushFrame,
      frameCallbacks,
      source,
    } = createHarness();

    engine.handlePointerDown(makePointerEvent("pointerdown", { x: 5, y: 5 }));
    engine.handlePointerMove(makePointerEvent("pointermove", { x: 35, y: 45 }));
    flushFrame(16);
    engine.handlePointerUp(makePointerEvent("pointerup", { x: 35, y: 45 }));

    expect(source.style.visibility).toBe("hidden");

    fireCommitTeardownDeadline();

    expect(source.style.visibility).toBe("visible");
    expect(
      document.body.querySelector("[data-calendar-draft-event]"),
    ).toBeNull();
    expect(frameCallbacks.size).toBe(0);
  });

  it("tears down a held commit when the source element leaves the DOM", () => {
    const { engine, flushFrame, source } = createHarness();

    engine.handlePointerDown(makePointerEvent("pointerdown", { x: 5, y: 5 }));
    engine.handlePointerMove(makePointerEvent("pointermove", { x: 35, y: 45 }));
    flushFrame(16);
    engine.handlePointerUp(makePointerEvent("pointerup", { x: 35, y: 45 }));

    source.remove();
    flushFrame(32);

    expect(source.style.visibility).toBe("visible");
    expect(
      document.body.querySelector("[data-calendar-draft-event]"),
    ).toBeNull();
  });

  it("flushes a held commit teardown when a new interaction starts", () => {
    const { engine, flushFrame, source } = createHarness();

    engine.handlePointerDown(makePointerEvent("pointerdown", { x: 5, y: 5 }));
    engine.handlePointerMove(makePointerEvent("pointermove", { x: 35, y: 45 }));
    flushFrame(16);
    engine.handlePointerUp(makePointerEvent("pointerup", { x: 35, y: 45 }));

    expect(source.style.visibility).toBe("hidden");

    expect(
      engine.handlePointerDown(makePointerEvent("pointerdown", { x: 5, y: 5 })),
    ).toBe(true);

    expect(source.style.visibility).toBe("visible");
    expect(
      document.body.querySelector("[data-calendar-draft-event]"),
    ).toBeNull();
    expect(engine.getSession()).toMatchObject({ phase: "pending" });
  });

  it("recomputes the visual from the release pointer before commit", () => {
    const { commit, engine, flushFrame } = createHarness();

    engine.handlePointerDown(makePointerEvent("pointerdown", { x: 5, y: 5 }));
    engine.handlePointerMove(makePointerEvent("pointermove", { x: 35, y: 45 }));
    flushFrame(16);

    engine.handlePointerUp(makePointerEvent("pointerup", { x: 55, y: 65 }));

    expect(commit).toHaveBeenCalledWith(
      expect.objectContaining({
        visual: expect.objectContaining({
          transform: {
            x: 50,
            y: 60,
          },
        }),
      }),
    );
  });

  it("cancels cleanly on blur and can be cancelled repeatedly", () => {
    const { cancel, engine, source } = createHarness();
    const disconnect = engine.connectCancellationEvents();

    engine.handlePointerDown(makePointerEvent("pointerdown"));
    engine.handlePointerMove(makePointerEvent("pointermove", { x: 26, y: 0 }));

    window.dispatchEvent(new Event("blur"));
    disconnect();
    engine.cancel();

    expect(cancel).toHaveBeenCalledTimes(1);
    expect(source.style.visibility).toBe("visible");
    expect(
      document.body.querySelector("[data-calendar-draft-event]"),
    ).toBeNull();
    expect(engine.getSession()).toEqual({ phase: "idle" });
    expect(engine.getMetrics()).toMatchObject({
      active: false,
      cancellationCount: 1,
      phase: "cancelled",
    });
  });

  it("cancels through connected pointer cancellation events", () => {
    const { cancel, engine } = createHarness();
    const disconnect = engine.connectCancellationEvents();

    engine.handlePointerDown(makePointerEvent("pointerdown", { pointerId: 3 }));
    engine.handlePointerMove(
      makePointerEvent("pointermove", { pointerId: 3, x: 40 }),
    );

    window.dispatchEvent(
      makePointerEvent("lostpointercapture", { pointerId: 3 }),
    );
    disconnect();

    expect(cancel).toHaveBeenCalledTimes(1);
    expect(engine.getSession()).toEqual({ phase: "idle" });
    expect(engine.getMetrics()).toMatchObject({
      cancellationCount: 1,
      phase: "cancelled",
    });
  });

  it("tracks frame gaps after the first animation frame", () => {
    const { engine, flushFrame } = createHarness();

    engine.handlePointerDown(makePointerEvent("pointerdown"));
    engine.handlePointerMove(makePointerEvent("pointermove", { x: 26 }));
    flushFrame(16);
    engine.handlePointerMove(makePointerEvent("pointermove", { x: 40 }));
    flushFrame(32);

    expect(engine.getMetrics().frameGaps).toEqual([16]);
  });

  it("re-syncs the visual when the source element's scrollable ancestor scrolls during motion", () => {
    const { adapter, engine, flushFrame, scrollContainer } = createHarness({
      scrollableAncestor: { clientHeight: 500, scrollHeight: 1000 },
    });

    engine.handlePointerDown(makePointerEvent("pointerdown", { x: 5, y: 5 }));
    engine.handlePointerMove(makePointerEvent("pointermove", { x: 35, y: 45 }));
    flushFrame(16);

    expect(adapter.updateVisual).toHaveBeenCalledTimes(1);

    scrollContainer?.dispatchEvent(new Event("scroll"));
    flushFrame(32);

    expect(adapter.updateVisual).toHaveBeenCalledTimes(2);
    expect(adapter.updateVisual).toHaveBeenLastCalledWith(
      expect.objectContaining({ pointer: { x: 35, y: 45 } }),
    );
  });

  it("ignores scroll events on the scrollable ancestor outside of an active motion session", () => {
    const { frameCallbacks, scrollContainer } = createHarness({
      scrollableAncestor: { clientHeight: 500, scrollHeight: 1000 },
    });

    scrollContainer?.dispatchEvent(new Event("scroll"));

    expect(frameCallbacks.size).toBe(0);
  });

  it("stops listening to the scrollable ancestor after commit", () => {
    const {
      engine,
      fireCommitTeardownDeadline,
      flushFrame,
      frameCallbacks,
      scrollContainer,
    } = createHarness({
      scrollableAncestor: { clientHeight: 500, scrollHeight: 1000 },
    });

    engine.handlePointerDown(makePointerEvent("pointerdown", { x: 5, y: 5 }));
    engine.handlePointerMove(makePointerEvent("pointermove", { x: 35, y: 45 }));
    flushFrame(16);
    engine.handlePointerUp(makePointerEvent("pointerup", { x: 35, y: 45 }));
    fireCommitTeardownDeadline();

    scrollContainer?.dispatchEvent(new Event("scroll"));

    expect(frameCallbacks.size).toBe(0);
  });

  it("does not treat a non-scrollable ancestor as a scroll sync target", () => {
    const { engine, flushFrame, frameCallbacks, scrollContainer } =
      createHarness({
        scrollableAncestor: { clientHeight: 500, scrollHeight: 500 },
      });

    engine.handlePointerDown(makePointerEvent("pointerdown", { x: 5, y: 5 }));
    engine.handlePointerMove(makePointerEvent("pointermove", { x: 35, y: 45 }));
    flushFrame(16);

    scrollContainer?.dispatchEvent(new Event("scroll"));

    expect(frameCallbacks.size).toBe(0);
  });
});

describe("FloatingDraftEvent", () => {
  it("mounts a body-level clone and applies immediate transform updates", () => {
    const clone = document.createElement("div");
    const draftEvent = new FloatingDraftEvent();

    draftEvent.mount({
      clone,
      rect: {
        height: 20,
        left: 10,
        top: 12,
        width: 60,
      },
    });
    draftEvent.update({
      height: 24,
      transform: {
        x: 7,
        y: 9,
      },
      width: 70,
    });

    expect(draftEvent.getNode()).toBe(clone);
    expect(clone.parentElement).toBe(document.body);
    expect(clone.style.position).toBe("fixed");
    expect(clone.style.transition).toBe("none");
    expect(clone.style.transform).toBe("translate3d(7px, 9px, 0)");
    expect(clone.style.height).toBe("24px");
    expect(clone.style.width).toBe("70px");
    expect(clone.style.zIndex).toBe(`${ZIndex.MAX}`);

    draftEvent.unmount();

    expect(clone.parentElement).toBeNull();
  });
});

describe("createDraftEventClone", () => {
  it("removes interaction-hostile attributes from the clone tree", () => {
    const source = document.createElement("div");
    const child = document.createElement("button");

    source.id = "source";
    source.setAttribute("tabindex", "0");
    source.setAttribute("aria-controls", "menu");
    child.id = "child";
    child.setAttribute("aria-labelledby", "label");
    child.setAttribute("aria-describedby", "description");
    source.append(child);

    const clone = createDraftEventClone(source);
    const clonedChild = clone.querySelector("button");

    expect(clone.id).toBe("");
    expect(clone.getAttribute("tabindex")).toBeNull();
    expect(clone.getAttribute("aria-controls")).toBeNull();
    expect(clone).toHaveAttribute("aria-hidden", "true");
    expect(clone).toHaveAttribute("data-calendar-draft-event", "true");
    expect(clone.style.margin).toBe("0px");
    expect(clone.style.pointerEvents).toBe("none");
    expect(clonedChild?.id).toBe("");
    expect(clonedChild?.getAttribute("aria-labelledby")).toBeNull();
    expect(clonedChild?.getAttribute("aria-describedby")).toBeNull();
  });
});
