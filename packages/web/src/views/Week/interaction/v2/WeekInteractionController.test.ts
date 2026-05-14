import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import {
  getRegisteredWeekEvent,
  registerWeekEventElement,
} from "./geometry/eventRegistry";
import { WeekInteractionController } from "./WeekInteractionController";
import { describe, expect, it } from "bun:test";

describe("WeekInteractionController", () => {
  it("refuses pointer ownership while passive", () => {
    const controller = new WeekInteractionController();

    expect(controller.canOwnPointerDown()).toBe(false);
  });

  it("keeps quick eligible presses as clicks", () => {
    const { controller, sourceElement, unregister } = setupEligibleController();
    const down = createPointerEvent("pointerdown", sourceElement, 100, 100);

    expect(controller.handlePointerDown(down)).toBe(true);
    expect(controller.getSession().phase).toBe("pending");

    const result = controller.handlePointerUp(
      createPointerEvent("pointerup", sourceElement, 100, 100),
    );

    expect(result).toMatchObject({ eventId: "event-1", type: "click" });
    expect(result?.event).toMatchObject({ _id: "event-1" });
    expect(controller.getSession().phase).toBe("idle");

    unregister();
  });

  it("returns a moved event only after active timed drag release", () => {
    let frameCallback: FrameRequestCallback | null = null;
    const runFrame = (timestamp: number) => {
      const callback = frameCallback;
      if (!callback) {
        throw new Error("Expected a scheduled animation frame.");
      }
      callback(timestamp);
    };
    const { controller, sourceElement, unregister } = setupEligibleController(
      {
        requestFrame: (callback) => {
          frameCallback = callback;
          return 1;
        },
      },
      {
        endDate: "2026-05-12T11:00:00",
        startDate: "2026-05-12T10:00:00",
        title: "Original title",
      },
    );

    controller.handlePointerDown(
      createPointerEvent("pointerdown", sourceElement, 250, 120),
    );
    controller.handlePointerMove(
      createPointerEvent("pointermove", sourceElement, 280, 150),
    );
    runFrame(16);
    controller.handlePointerMove(
      createPointerEvent("pointermove", sourceElement, 365, 210),
    );
    runFrame(32);

    const result = controller.handlePointerUp(
      createPointerEvent("pointerup", sourceElement, 365, 210),
    );

    expect(result).toMatchObject({
      eventId: "event-1",
      formEventIdAtPointerDown: null,
      hadFormOpenBeforeInteraction: false,
      hasMoved: true,
      type: "timedDragEnd",
    });
    expect(result?.event.title).toBe("Original title");
    expect(result?.event.startDate).toContain("2026-05-13T11:30:00");
    expect(result?.event.endDate).toContain("2026-05-13T12:30:00");
    expect(controller.getSession().phase).toBe("idle");

    unregister();
  });

  it("carries form-open metadata through moved timed drag release", () => {
    let frameCallback: FrameRequestCallback | null = null;
    const runFrame = (timestamp: number) => {
      const callback = frameCallback;
      if (!callback) {
        throw new Error("Expected a scheduled animation frame.");
      }
      callback(timestamp);
    };
    const { controller, sourceElement, unregister } = setupEligibleController({
      getFormEventId: () => "event-1",
      isFormOpen: () => true,
      requestFrame: (callback) => {
        frameCallback = callback;
        return 1;
      },
    });

    controller.handlePointerDown(
      createPointerEvent("pointerdown", sourceElement, 250, 120),
    );
    controller.handlePointerMove(
      createPointerEvent("pointermove", sourceElement, 280, 150),
    );
    runFrame(16);

    const result = controller.handlePointerUp(
      createPointerEvent("pointerup", sourceElement, 280, 150),
    );

    expect(result).toMatchObject({
      eventId: "event-1",
      formEventIdAtPointerDown: "event-1",
      hadFormOpenBeforeInteraction: true,
      type: "timedDragEnd",
    });

    unregister();
  });

  it("activates timed drag after movement crosses the threshold", () => {
    const { controller, sourceElement, unregister } = setupEligibleController();

    controller.handlePointerDown(
      createPointerEvent("pointerdown", sourceElement, 100, 100),
    );
    controller.handlePointerMove(
      createPointerEvent("pointermove", sourceElement, 126, 100),
    );

    expect(controller.getSession()).toMatchObject({
      activatedBy: "move",
      eventId: "event-1",
      phase: "motion",
    });

    unregister();
  });

  it("activates timed drag after the hold delay", () => {
    let holdCallback: () => void = () => {
      throw new Error("Hold timer callback was not registered.");
    };
    const { controller, sourceElement, unregister } = setupEligibleController({
      setTimer: (callback) => {
        holdCallback = callback;
        return 1;
      },
    });

    controller.handlePointerDown(
      createPointerEvent("pointerdown", sourceElement, 100, 100),
    );
    holdCallback();

    expect(controller.getSession()).toMatchObject({
      activatedBy: "hold",
      eventId: "event-1",
      phase: "motion",
    });

    unregister();
  });

  it("snapshots form state when the form is already open", () => {
    const { controller, sourceElement, unregister } = setupEligibleController({
      getFormEventId: () => "event-1",
      isFormOpen: () => true,
    });

    expect(
      controller.handlePointerDown(
        createPointerEvent("pointerdown", sourceElement, 100, 100),
      ),
    ).toBe(true);
    expect(controller.getSession()).toMatchObject({
      formEventIdAtPointerDown: "event-1",
      formOpenAtPointerDown: true,
      phase: "pending",
    });

    unregister();
  });

  it("owns recurring timed drags so the boundary can route the recurrence scope flow", () => {
    const recurring = setupEligibleController(
      {},
      { recurrence: { rule: ["RRULE:FREQ=WEEKLY"] } },
    );

    expect(
      recurring.controller.handlePointerDown(
        createPointerEvent("pointerdown", recurring.sourceElement, 100, 100),
      ),
    ).toBe(true);

    recurring.unregister();
  });

  it("falls through for pending, all-day, resize, and unregistered targets", () => {
    const pending = setupEligibleController({
      isPendingEvent: () => true,
    });
    expect(
      pending.controller.handlePointerDown(
        createPointerEvent("pointerdown", pending.sourceElement, 100, 100),
      ),
    ).toBe(false);
    pending.unregister();

    const allDay = setupEligibleController({}, { isAllDay: true }, "allDay");
    expect(
      allDay.controller.handlePointerDown(
        createPointerEvent("pointerdown", allDay.sourceElement, 100, 100),
      ),
    ).toBe(false);
    allDay.unregister();

    const resize = setupEligibleController();
    const resizeHandle = document.createElement("div");
    resizeHandle.setAttribute("data-week-event-resize-handle", "endDate");
    resize.sourceElement.append(resizeHandle);
    expect(
      resize.controller.handlePointerDown(
        createPointerEvent("pointerdown", resizeHandle, 100, 100),
      ),
    ).toBe(false);
    resize.unregister();

    const unregistered = document.createElement("div");
    unregistered.setAttribute("data-week-event-id", "missing-event");
    unregistered.setAttribute("data-week-event-kind", "timed");
    unregistered.setAttribute("data-week-event-role", "event");
    const controller = new WeekInteractionController({ isEnabled: true });
    expect(
      controller.handlePointerDown(
        createPointerEvent("pointerdown", unregistered, 100, 100),
      ),
    ).toBe(false);
  });

  it("falls through for first and last visible day drags until edge navigation migrates", () => {
    const firstDay = setupEligibleController(
      {},
      {
        endDate: "2026-05-10T11:00:00",
        startDate: "2026-05-10T10:00:00",
      },
    );
    expect(
      firstDay.controller.handlePointerDown(
        createPointerEvent("pointerdown", firstDay.sourceElement, 100, 100),
      ),
    ).toBe(false);
    firstDay.unregister();

    const lastDay = setupEligibleController(
      {},
      {
        endDate: "2026-05-16T11:00:00",
        startDate: "2026-05-16T10:00:00",
      },
    );
    expect(
      lastDay.controller.handlePointerDown(
        createPointerEvent("pointerdown", lastDay.sourceElement, 100, 100),
      ),
    ).toBe(false);
    lastDay.unregister();
  });

  it("falls through for scroll-zone drags until smart scroll migrates", () => {
    const nearTop = setupEligibleController(
      {},
      {},
      "timed",
      { height: 60, left: 200, top: 20, width: 100 },
      { clientHeight: 300, scrollHeight: 660 },
    );

    expect(
      nearTop.controller.handlePointerDown(
        createPointerEvent("pointerdown", nearTop.sourceElement, 250, 40),
      ),
    ).toBe(false);

    nearTop.unregister();
  });
});

const createPointerEvent = (
  type: string,
  target: Element,
  clientX: number,
  clientY: number,
): PointerEvent =>
  ({
    clientX,
    clientY,
    pointerId: 1,
    target,
    type,
  }) as unknown as PointerEvent;

const setupEligibleController = (
  overrides: ConstructorParameters<typeof WeekInteractionController>[0] = {},
  eventOverrides: Partial<Schema_GridEvent> = {},
  kind: "timed" | "allDay" = "timed",
  sourceRect = { height: 60, left: 200, top: 100, width: 100 },
  gridSize = { clientHeight: 660, scrollHeight: 660 },
) => {
  const mainGrid = document.createElement("div");
  mainGrid.id = "mainGrid";
  Object.defineProperties(mainGrid, {
    clientHeight: { value: gridSize.clientHeight },
    scrollHeight: { value: gridSize.scrollHeight },
  });
  mainGrid.getBoundingClientRect = () =>
    ({
      height: 660,
      left: 0,
      bottom: 660,
      top: 0,
      width: 700,
    }) as DOMRect;
  const sourceElement = document.createElement("div");
  sourceElement.setAttribute("data-week-event-id", "event-1");
  sourceElement.setAttribute("data-week-event-kind", kind);
  sourceElement.setAttribute("data-week-event-role", "event");
  sourceElement.getBoundingClientRect = () =>
    ({
      bottom: sourceRect.top + sourceRect.height,
      height: sourceRect.height,
      left: sourceRect.left,
      top: sourceRect.top,
      width: sourceRect.width,
    }) as DOMRect;
  document.body.append(mainGrid, sourceElement);

  const event = {
    _id: "event-1",
    endDate: "2026-05-12T11:00:00.000Z",
    isAllDay: false,
    recurrence: undefined,
    startDate: "2026-05-12T10:00:00.000Z",
    ...eventOverrides,
  } as Schema_GridEvent;
  const unregisterRegistry = registerWeekEventElement("event-1", {
    element: sourceElement,
    event,
    kind,
  });

  return {
    controller: new WeekInteractionController({
      getRegisteredEvent: getRegisteredWeekEvent,
      isEnabled: true,
      isFormOpen: () => false,
      isPendingEvent: () => false,
      ...overrides,
    }),
    sourceElement,
    unregister: () => {
      unregisterRegistry();
      mainGrid.remove();
      sourceElement.remove();
    },
  };
};
