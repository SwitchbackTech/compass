import { ObjectId } from "bson";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import { DATA_EVENT_ELEMENT_ID } from "@web/common/constants/web.constants";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import {
  addId,
  isEventInRange,
  refocusEventElement,
} from "@web/common/utils/event/event.util";
import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";

const { handleError } = await import("@web/common/utils/event/event.util");

describe("handleError", () => {
  let consoleErrorSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  // handleError now surfaces a toast (showErrorToast) instead of a native
  // alert(). We assert on console.error rather than the toast: showErrorToast
  // is import-bound to react-toastify, which several sibling suites replace
  // process-wide via `mock.module`, so spying on the toast singleton is
  // order-fragile. console.error is a call-time global — a stable seam that
  // cleanly distinguishes "handled/notified" from "silently ignored", since
  // handleError logs immediately before it notifies.

  it("does not log backend-unavailable errors", () => {
    const error = new Error("Request failed");
    error.name = "ApiError";

    handleError(error);

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it("logs once and does not reload on a server error", () => {
    const error = new Error("Request failed with status 500");
    error.name = "ApiError";

    handleError(error);

    // No reload: the mutation layer reconciles the cache after failures, and
    // a reload would wipe every live optimistic update. console.error firing
    // proves handleError reached the notify path (rather than early-returning).
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(error);
  });
});

describe("isEventInRange", () => {
  it("returns true if event is in range", () => {
    const event = { start: "2022-03-15", end: "2022-03-15" };
    const dates = {
      start: "2022-03-14",
      end: "2022-03-19",
    };
    expect(isEventInRange(event, dates)).toBe(true);
  });

  it("returns false if event is not in range", () => {
    const event = { start: "2022-03-15", end: "2022-03-15" };
    const dates = {
      start: "2022-03-16",
      end: "2022-03-19",
    };
    expect(isEventInRange(event, dates)).toBe(false);
  });
});

describe("addId", () => {
  it("should add a raw MongoID", () => {
    const event = {
      ...createMockStandaloneEvent(),
      _id: "existing-id",
    } as Schema_GridEvent;
    const result = addId(event);

    expect(result._id).toBeDefined();
    expect(ObjectId.isValid(result._id)).toBe(true);
    expect(result._id).toMatch(/^[a-f0-9]{24}$/);
  });
});

describe("refocusEventElement", () => {
  const EVENT_ID = "507f1f77bcf86cd799439011";
  let pendingFrames: FrameRequestCallback[];
  let originalRequestAnimationFrame: typeof requestAnimationFrame;

  const addEventElement = () => {
    const element = document.createElement("div");
    element.setAttribute(DATA_EVENT_ELEMENT_ID, EVENT_ID);
    element.tabIndex = 0;
    document.body.appendChild(element);
    return element;
  };

  const flushFrame = () => {
    const frames = pendingFrames.splice(0);
    frames.forEach((frame) => frame(performance.now()));
  };

  beforeEach(() => {
    pendingFrames = [];
    originalRequestAnimationFrame = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = ((frame: FrameRequestCallback) =>
      pendingFrames.push(frame)) as typeof requestAnimationFrame;
  });

  afterEach(() => {
    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    document.body.innerHTML = "";
  });

  it("focuses the event's element once it is replaced", () => {
    const staleElement = addEventElement();
    staleElement.focus();

    refocusEventElement(EVENT_ID);
    flushFrame();

    // Simulate React replacing the element on the next render.
    staleElement.remove();
    const newElement = addEventElement();
    flushFrame();

    expect(document.activeElement).toBe(newElement);
  });

  it("does not refocus the stale element and stops retrying", () => {
    const staleElement = addEventElement();
    staleElement.focus();
    staleElement.blur();

    refocusEventElement(EVENT_ID);

    let flushes = 0;
    while (pendingFrames.length > 0 && flushes < 100) {
      flushFrame();
      flushes += 1;
    }

    expect(document.activeElement).not.toBe(staleElement);
    expect(flushes).toBeLessThanOrEqual(31);
  });
});
