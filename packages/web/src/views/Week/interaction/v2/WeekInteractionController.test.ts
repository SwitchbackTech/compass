import { ID_GRID_COLUMNS_TIMED } from "@web/common/constants/web.constants";
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

    const label = document.createElement("span");
    label.setAttribute("role", "textbox");
    label.textContent = "10 - 11am";
    sourceElement.append(label);

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

    const overlay = document.querySelector<HTMLElement>(
      "[data-week-interaction-overlay='true']",
    );
    expect(overlay?.querySelector("[role='textbox']")?.textContent).toBe(
      "11:45 AM - 12:45 PM",
    );

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
    expect(result?.event.startDate).toContain("2026-05-13T11:45:00");
    expect(result?.event.endDate).toContain("2026-05-13T12:45:00");
    expect(controller.getSession().phase).toBe("idle");

    unregister();
  });

  it("shows a time label and move cursor for short timed drags", () => {
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
        endDate: "2026-05-12T10:30:00",
        startDate: "2026-05-12T10:00:00",
        title: "Short event",
      },
      "timed",
      { height: 18, left: 200, top: 100, width: 100 },
    );

    try {
      controller.handlePointerDown(
        createPointerEvent("pointerdown", sourceElement, 250, 120),
      );
      controller.handlePointerMove(
        createPointerEvent("pointermove", sourceElement, 280, 150),
      );
      runFrame(16);
      controller.handlePointerMove(
        createPointerEvent("pointermove", sourceElement, 280, 170),
      );
      runFrame(32);

      const overlay = document.querySelector<HTMLElement>(
        "[data-week-interaction-overlay='true']",
      );

      expect(overlay?.style.cursor).toBe("move");
      expect(document.body.style.cursor).toBe("move");
      expect(overlay?.querySelector("[role='textbox']")?.textContent).toBe(
        "11  - 11:30 AM",
      );

      controller.handlePointerUp(
        createPointerEvent("pointerup", sourceElement, 280, 150),
      );

      expect(document.body.style.cursor).toBe("");
    } finally {
      if (controller.getSession().phase !== "idle") {
        controller.handlePointerUp(
          createPointerEvent("pointerup", sourceElement, 280, 150),
        );
      }
      document.body.style.cursor = "";
      unregister();
    }
  });

  it("snaps the timed drag overlay to the rendered day columns", () => {
    let frameCallback: FrameRequestCallback | null = null;
    const runFrame = (timestamp: number) => {
      const callback = frameCallback;
      if (!callback) {
        throw new Error("Expected a scheduled animation frame.");
      }
      callback(timestamp);
    };
    const { controller, mainGrid, sourceElement, unregister } =
      setupEligibleController(
        {
          requestFrame: (callback) => {
            frameCallback = callback;
            return 1;
          },
        },
        {
          endDate: "2026-05-12T11:00:00",
          startDate: "2026-05-12T10:00:00",
        },
        "timed",
        { height: 60, left: 255, top: 100, width: 90 },
      );
    mainGrid.getBoundingClientRect = () =>
      ({
        bottom: 660,
        height: 660,
        left: 0,
        right: 750,
        top: 0,
        width: 750,
      }) as DOMRect;
    const timedColumns = document.createElement("div");
    timedColumns.id = ID_GRID_COLUMNS_TIMED;
    timedColumns.getBoundingClientRect = () =>
      ({
        bottom: 660,
        height: 660,
        left: 50,
        right: 750,
        top: 0,
        width: 700,
      }) as DOMRect;
    document.body.append(timedColumns);

    try {
      controller.handlePointerDown(
        createPointerEvent("pointerdown", sourceElement, 300, 120),
      );
      controller.handlePointerMove(
        createPointerEvent("pointermove", sourceElement, 330, 120),
      );
      runFrame(16);
      controller.handlePointerMove(
        createPointerEvent("pointermove", sourceElement, 405, 120),
      );
      runFrame(32);

      const overlay = document.querySelector<HTMLElement>(
        "[data-week-interaction-overlay='true']",
      );
      expect(overlay?.style.transition).toBe("");
      expect(overlay?.style.transform).toBe("translate3d(100px, 0px, 0)");

      controller.handlePointerUp(
        createPointerEvent("pointerup", sourceElement, 405, 120),
      );
    } finally {
      timedColumns.remove();
      unregister();
    }
  });

  it("keeps same-day timed drag motion immediate", () => {
    let frameCallback: FrameRequestCallback | null = null;
    const runFrame = (timestamp: number) => {
      const callback = frameCallback;
      if (!callback) {
        throw new Error("Expected a scheduled animation frame.");
      }
      frameCallback = null;
      callback(timestamp);
    };
    const { controller, sourceElement, unregister } = setupEligibleController({
      requestFrame: (callback) => {
        frameCallback = callback;
        return 1;
      },
    });

    try {
      controller.handlePointerDown(
        createPointerEvent("pointerdown", sourceElement, 250, 120),
      );
      controller.handlePointerMove(
        createPointerEvent("pointermove", sourceElement, 250, 150),
      );
      runFrame(16);
      controller.handlePointerMove(
        createPointerEvent("pointermove", sourceElement, 250, 210),
      );
      runFrame(32);

      const overlay = document.querySelector<HTMLElement>(
        "[data-week-interaction-overlay='true']",
      );

      expect(overlay?.style.transition).toBe("");
    } finally {
      if (controller.getSession().phase !== "idle") {
        controller.handlePointerUp(
          createPointerEvent("pointerup", sourceElement, 250, 210),
        );
      }
      unregister();
    }
  });

  it("keeps day-crossing timed drag motion immediate", () => {
    let frameCallback: FrameRequestCallback | null = null;
    const runFrame = (timestamp: number) => {
      const callback = frameCallback;
      if (!callback) {
        throw new Error("Expected a scheduled animation frame.");
      }
      frameCallback = null;
      callback(timestamp);
    };
    const { controller, sourceElement, unregister } = setupEligibleController({
      requestFrame: (callback) => {
        frameCallback = callback;
        return 1;
      },
    });

    try {
      controller.handlePointerDown(
        createPointerEvent("pointerdown", sourceElement, 250, 120),
      );
      controller.handlePointerMove(
        createPointerEvent("pointermove", sourceElement, 280, 120),
      );
      runFrame(16);
      controller.handlePointerMove(
        createPointerEvent("pointermove", sourceElement, 365, 120),
      );
      runFrame(32);

      const overlay = document.querySelector<HTMLElement>(
        "[data-week-interaction-overlay='true']",
      );

      expect(overlay?.style.transition).toBe("");
    } finally {
      if (controller.getSession().phase !== "idle") {
        controller.handlePointerUp(
          createPointerEvent("pointerup", sourceElement, 280, 150),
        );
      }
      unregister();
    }
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

  it("owns timed resize handles", () => {
    const resize = setupEligibleController();
    const resizeHandle = document.createElement("div");
    resizeHandle.setAttribute("data-week-event-resize-handle", "endDate");
    resize.sourceElement.append(resizeHandle);

    expect(
      resize.controller.handlePointerDown(
        createPointerEvent("pointerdown", resizeHandle, 100, 100),
      ),
    ).toBe(true);
    expect(resize.controller.getSession()).toMatchObject({
      edge: "endDate",
      eventId: "event-1",
      kind: "timedResize",
      phase: "pending",
    });

    resize.unregister();
  });

  it("owns all-day drags", () => {
    const allDay = setupEligibleController(
      {},
      {
        endDate: "2026-05-14",
        isAllDay: true,
        startDate: "2026-05-13",
      },
      "allDay",
    );

    expect(
      allDay.controller.handlePointerDown(
        createPointerEvent("pointerdown", allDay.sourceElement, 250, 40),
      ),
    ).toBe(true);
    expect(allDay.controller.getSession()).toMatchObject({
      eventId: "event-1",
      kind: "allDayDrag",
      phase: "pending",
    });

    allDay.unregister();
  });

  it("owns all-day resize handles", () => {
    const allDay = setupEligibleController(
      {},
      {
        endDate: "2026-05-15",
        isAllDay: true,
        startDate: "2026-05-13",
      },
      "allDay",
      { height: 20, left: 300, top: 20, width: 196 },
    );
    const resizeHandle = document.createElement("div");
    resizeHandle.setAttribute("data-week-event-resize-handle", "endDate");
    allDay.sourceElement.append(resizeHandle);

    expect(
      allDay.controller.handlePointerDown(
        createPointerEvent("pointerdown", resizeHandle, 495, 30),
      ),
    ).toBe(true);
    expect(allDay.controller.getSession()).toMatchObject({
      edge: "endDate",
      eventId: "event-1",
      kind: "allDayResize",
      phase: "pending",
    });

    allDay.unregister();
  });

  it("returns a moved all-day event after active all-day drag release", () => {
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
        endDate: "2026-05-14",
        isAllDay: true,
        startDate: "2026-05-13",
      },
      "allDay",
    );

    controller.handlePointerDown(
      createPointerEvent("pointerdown", sourceElement, 250, 40),
    );
    controller.handlePointerMove(
      createPointerEvent("pointermove", sourceElement, 280, 40),
    );
    runFrame(16);
    controller.handlePointerMove(
      createPointerEvent("pointermove", sourceElement, 370, 40),
    );
    runFrame(32);

    const result = controller.handlePointerUp(
      createPointerEvent("pointerup", sourceElement, 370, 40),
    );

    expect(result).toMatchObject({
      event: {
        endDate: "2026-05-15",
        startDate: "2026-05-14",
      },
      eventId: "event-1",
      hasMoved: true,
      type: "allDayDragEnd",
    });

    unregister();
  });

  it("returns a resized all-day event after active all-day resize release", () => {
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
        endDate: "2026-05-15",
        isAllDay: true,
        startDate: "2026-05-13",
      },
      "allDay",
      { height: 20, left: 300, top: 20, width: 196 },
    );
    const resizeHandle = document.createElement("div");
    resizeHandle.setAttribute("data-week-event-resize-handle", "endDate");
    sourceElement.append(resizeHandle);

    controller.handlePointerDown(
      createPointerEvent("pointerdown", resizeHandle, 495, 30),
    );
    controller.handlePointerMove(
      createPointerEvent("pointermove", resizeHandle, 530, 30),
    );
    runFrame(16);
    controller.handlePointerMove(
      createPointerEvent("pointermove", resizeHandle, 555, 30),
    );
    runFrame(32);

    const result = controller.handlePointerUp(
      createPointerEvent("pointerup", resizeHandle, 555, 30),
    );

    expect(result).toMatchObject({
      event: {
        endDate: "2026-05-16",
        startDate: "2026-05-13",
      },
      eventId: "event-1",
      hasMoved: true,
      type: "allDayResizeEnd",
    });

    unregister();
  });

  it("returns a resized event after active timed resize release", () => {
    let frameCallback: FrameRequestCallback | null = null;
    const runFrame = (timestamp: number) => {
      const callback = frameCallback;
      if (!callback) {
        throw new Error("Expected a scheduled animation frame.");
      }
      callback(timestamp);
    };
    const { controller, sourceElement, unregister } = setupEligibleController({
      requestFrame: (callback) => {
        frameCallback = callback;
        return 1;
      },
    });
    const resizeHandle = document.createElement("div");
    resizeHandle.setAttribute("data-week-event-resize-handle", "endDate");
    sourceElement.append(resizeHandle);

    controller.handlePointerDown(
      createPointerEvent("pointerdown", resizeHandle, 250, 160),
    );
    controller.handlePointerMove(
      createPointerEvent("pointermove", resizeHandle, 250, 190),
    );
    runFrame(16);
    controller.handlePointerMove(
      createPointerEvent("pointermove", resizeHandle, 250, 220),
    );
    runFrame(32);

    const result = controller.handlePointerUp(
      createPointerEvent("pointerup", resizeHandle, 250, 220),
    );

    expect(result).toMatchObject({
      eventId: "event-1",
      hasMoved: true,
      type: "timedResizeEnd",
    });

    unregister();
  });

  it("falls through for pending and unregistered targets", () => {
    const pending = setupEligibleController({
      isPendingEvent: () => true,
    });
    expect(
      pending.controller.handlePointerDown(
        createPointerEvent("pointerdown", pending.sourceElement, 100, 100),
      ),
    ).toBe(false);
    pending.unregister();

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

  it("owns first and last visible day drags after edge navigation migrates", () => {
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
    ).toBe(true);
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
    ).toBe(true);
    lastDay.unregister();
  });

  it("requests one next-week navigation per edge dwell and saves in that week", () => {
    let frameCallback: FrameRequestCallback | null = null;
    const runFrame = (timestamp: number) => {
      const callback = frameCallback;
      if (!callback) {
        throw new Error("Expected a scheduled animation frame.");
      }
      frameCallback = null;
      callback(timestamp);
    };
    const requestedNavigations: Array<"next" | "prev"> = [];
    const { controller, sourceElement, unregister } = setupEligibleController(
      {
        edgeNavigationDwellMs: 20,
        onRequestWeekNavigation: (direction) => {
          requestedNavigations.push(direction);
        },
        requestFrame: (callback) => {
          frameCallback = callback;
          return 1;
        },
      },
      {
        endDate: "2026-05-16T11:00:00",
        startDate: "2026-05-16T10:00:00",
      },
      "timed",
      { height: 60, left: 600, top: 100, width: 80 },
    );

    controller.handlePointerDown(
      createPointerEvent("pointerdown", sourceElement, 650, 120),
    );
    controller.handlePointerMove(
      createPointerEvent("pointermove", sourceElement, 680, 120),
    );
    runFrame(16);
    controller.handlePointerMove(
      createPointerEvent("pointermove", sourceElement, 690, 120),
    );
    runFrame(32);
    runFrame(64);
    controller.handlePointerMove(
      createPointerEvent("pointermove", sourceElement, 690, 120),
    );
    runFrame(96);

    const result = controller.handlePointerUp(
      createPointerEvent("pointerup", sourceElement, 690, 120),
    );

    expect(requestedNavigations).toEqual(["next"]);
    expect(controller.getSession().phase).toBe("idle");
    expect(result).toMatchObject({
      event: {
        startDate: expect.stringContaining("2026-05-23T10:00:00"),
      },
      hasMoved: true,
      type: "timedDragEnd",
    });

    unregister();
  });

  it("owns scroll-zone timed drags after smart scroll migrates", () => {
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
    ).toBe(true);

    nearTop.unregister();
  });

  it("keeps timed resize scroll-zone candidates on the legacy path", () => {
    const nearTop = setupEligibleController(
      {},
      {},
      "timed",
      { height: 60, left: 200, top: 20, width: 100 },
      { clientHeight: 300, scrollHeight: 660 },
    );
    const resizeHandle = document.createElement("div");
    resizeHandle.setAttribute("data-week-event-resize-handle", "endDate");
    nearTop.sourceElement.append(resizeHandle);

    expect(
      nearTop.controller.handlePointerDown(
        createPointerEvent("pointerdown", resizeHandle, 250, 40),
      ),
    ).toBe(false);

    nearTop.unregister();
  });

  it("scrolls timed drags in the controller frame loop", () => {
    let frameCallback: FrameRequestCallback | null = null;
    const runFrame = (timestamp: number) => {
      const callback = frameCallback;
      if (!callback) {
        throw new Error("Expected a scheduled animation frame.");
      }
      frameCallback = null;
      callback(timestamp);
    };
    const { controller, mainGrid, sourceElement, unregister } =
      setupEligibleController(
        {
          requestFrame: (callback) => {
            frameCallback = callback;
            return 1;
          },
        },
        {
          endDate: "2026-05-12T11:00:00",
          startDate: "2026-05-12T10:00:00",
        },
        "timed",
        { height: 60, left: 200, top: 220, width: 100 },
        { clientHeight: 300, scrollHeight: 660 },
      );

    controller.handlePointerDown(
      createPointerEvent("pointerdown", sourceElement, 250, 260),
    );
    controller.handlePointerMove(
      createPointerEvent("pointermove", sourceElement, 250, 290),
    );
    runFrame(16);
    controller.handlePointerMove(
      createPointerEvent("pointermove", sourceElement, 250, 620),
    );
    runFrame(32);
    runFrame(48);

    const result = controller.handlePointerUp(
      createPointerEvent("pointerup", sourceElement, 250, 620),
    );

    expect(mainGrid.scrollTop).toBe(20);
    expect(result).toMatchObject({
      hasMoved: true,
      type: "timedDragEnd",
    });

    unregister();
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
  const allDayColumns = document.createElement("div");
  allDayColumns.id = "allDayColumns";
  Object.defineProperties(mainGrid, {
    clientHeight: { value: gridSize.clientHeight },
    scrollHeight: { value: gridSize.scrollHeight },
  });
  mainGrid.getBoundingClientRect = () =>
    ({
      height: 660,
      left: 0,
      bottom: 660,
      right: 700,
      top: 0,
      width: 700,
    }) as DOMRect;
  allDayColumns.getBoundingClientRect = () =>
    ({
      height: 60,
      left: 0,
      bottom: 60,
      right: 700,
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
      right: sourceRect.left + sourceRect.width,
      top: sourceRect.top,
      width: sourceRect.width,
    }) as DOMRect;
  document.body.append(mainGrid, allDayColumns, sourceElement);

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
    mainGrid,
    sourceElement,
    unregister: () => {
      unregisterRegistry();
      mainGrid.remove();
      allDayColumns.remove();
      sourceElement.remove();
    },
  };
};
