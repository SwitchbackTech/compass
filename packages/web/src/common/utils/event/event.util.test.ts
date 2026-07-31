import { ObjectId } from "bson";
import { Status } from "@core/errors/status.codes";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import { createTestToastPort } from "@web/__tests__/helpers/web-test-seams";
import { type ApiError, type ApiResponse } from "@web/api/api.types";
import { GENERIC_ERROR_TOAST_ID } from "@web/common/constants/toast.constants";
import { DATA_EVENT_ELEMENT_ID } from "@web/common/constants/web.constants";
import { type GridEvent } from "@web/common/types/web.event.types";
import {
  addId,
  isEventInRange,
  refocusEventElement,
} from "@web/common/utils/event/event.util";
import { registerToastPort } from "@web/common/utils/toast/toast.port";
import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";

const { handleError } = await import("@web/common/utils/event/event.util");

function createServerError(status = Status.INTERNAL_SERVER): ApiError {
  const error = new Error(`Request failed with status ${status}`) as ApiError;
  error.name = "ApiError";
  error.response = { status } as ApiResponse<unknown>;
  return error;
}

describe("handleError", () => {
  let consoleErrorSpy: ReturnType<typeof spyOn>;
  const { port, mocks } = createTestToastPort();

  beforeEach(() => {
    consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});
    mocks.error.mockClear();
    mocks.isActive.mockReturnValue(false);
    registerToastPort(port);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("does not log backend-unavailable errors", () => {
    const error = new Error("Request failed");
    error.name = "ApiError";

    handleError(error);

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(mocks.error).not.toHaveBeenCalled();
  });

  it("logs once and does not reload on a server error", () => {
    // Carries a `response` like a real 500 from `createApiError`: backend
    // availability is judged on the response status, not the message text.
    const error = createServerError();

    handleError(error);

    // No reload: the mutation layer reconciles the cache after failures, and
    // a reload would wipe every live optimistic update. console.error firing
    // proves handleError reached the notify path (rather than early-returning).
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(error);
    expect(mocks.error).toHaveBeenCalledTimes(1);
    expect(mocks.error.mock.calls[0]?.[1]).toMatchObject({
      toastId: GENERIC_ERROR_TOAST_ID,
    });
  });

  it("does not stack a second catchall toast while one is already visible", () => {
    mocks.isActive.mockReturnValue(true);
    const error = createServerError();

    handleError(error);
    handleError(error);

    expect(mocks.error).not.toHaveBeenCalled();
  });

  it("ignores unauthorized errors using response.status even when the message is enriched", () => {
    const error = new Error(
      "Request failed for GET /user/profile with status 401",
    ) as ApiError;
    error.name = "ApiError";
    error.response = { status: Status.UNAUTHORIZED } as ApiResponse<unknown>;

    handleError(error);

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it("shows a toast on a 404 instead of silently reverting the optimistic edit", () => {
    // Not a session failure (unlike GONE/UNAUTHORIZED) - the api interceptor
    // only console.error's a 404 and rethrows, so without this the user's
    // edit rolls back with zero visible feedback at all.
    const error = createServerError(Status.NOT_FOUND);

    handleError(error);

    expect(mocks.error).toHaveBeenCalledTimes(1);
    expect(mocks.error.mock.calls[0]?.[1]).toMatchObject({
      toastId: GENERIC_ERROR_TOAST_ID,
    });
  });

  it("does not log a retryable, backend-authored mutation failure", () => {
    // A 502 PROVIDER_FAILURE the backend authored: it answered (so it isn't
    // "unavailable"), and it's retryable, so the user just needs a nudge. It
    // must not console.error - otherwise every transient provider hiccup
    // becomes a fresh error-tracking issue via capture_console_errors.
    const error = createServerError(502);
    error.response = {
      status: 502,
      data: {
        code: "PROVIDER_FAILURE",
        message: "Google rejected the write",
        retryable: true,
      },
    } as ApiResponse<unknown>;

    handleError(error);

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalledTimes(1);
    expect(mocks.error.mock.calls[0]?.[1]).toMatchObject({
      toastId: GENERIC_ERROR_TOAST_ID,
    });
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
    } as GridEvent;
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
