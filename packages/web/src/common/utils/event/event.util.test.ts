import { ObjectId } from "bson";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import { DATA_EVENT_ELEMENT_ID } from "@web/common/constants/web.constants";
import {
  type Schema_GridEvent,
  type Schema_WebEvent,
} from "@web/common/types/web.event.types";
import {
  addId,
  isEventInRange,
  refocusEventElement,
} from "@web/common/utils/event/event.util";
import { _assembleGridEvent } from "@web/ducks/events/sagas/saga.util";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";

const { handleError } = await import("@web/common/utils/event/event.util");

describe("handleError", () => {
  const alertMock = mock();
  let consoleErrorSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    global.alert = alertMock as typeof global.alert;
    alertMock.mockClear();
    consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("does not log or alert backend-unavailable errors", () => {
    const error = new Error("Request failed");
    error.name = "ApiError";

    handleError(error);

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(alertMock).not.toHaveBeenCalled();
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

describe("_assembleGridEvent", () => {
  it("should successfully convert Someday event to Grid event by adding position field", () => {
    // Create a mock Someday event (without position field)
    const somedayEvent = createMockStandaloneEvent({
      _id: new ObjectId().toString(),
      isSomeday: true,
    }) as Schema_WebEvent & { _id: string };

    const generator = _assembleGridEvent(somedayEvent);

    // First, it calls getEventById
    const getEventStep = generator.next();
    expect(getEventStep.done).toBe(false);

    // Mock returning the Someday event
    const validateStep = generator.next({ ...somedayEvent, isSomeday: false });

    // This should now succeed because the fix adds the required position field
    expect(validateStep.done).toBe(true);
    const result = validateStep.value as Schema_GridEvent;

    // Verify that position field is now present
    expect(result.position).toBeDefined();
    expect(result.position.isOverlapping).toBe(false);
    expect(result.position.widthMultiplier).toBe(1);
    expect(result.position.horizontalOrder).toBe(1);
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
