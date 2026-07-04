import { type FC, useCallback } from "react";
import { Origin, Priorities } from "@core/constants/core.constants";
import dayjs from "@core/util/date/dayjs";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@web/__tests__/__mocks__/mock.render";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { gridEventDefaultPosition } from "@web/common/utils/event/event.util";
import {
  draftActions,
  selectIsEventFormOpen,
  useDraftStore,
} from "@web/events/stores/draft.store";
import { DayInteractionCoordinator } from "./DayInteractionCoordinator";
import { dayCalendarEventRegistry } from "./registry/dayCalendarEventRegistry";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import "@testing-library/jest-dom";

const timedEvent: Schema_GridEvent = {
  _id: "timed-event",
  endDate: "2026-05-20T10:00:00.000",
  isAllDay: false,
  origin: Origin.COMPASS,
  position: gridEventDefaultPosition,
  priority: Priorities.UNASSIGNED,
  startDate: "2026-05-20T09:00:00.000",
  title: "Timed event",
  user: "user-1",
};

const setRect = (
  element: HTMLElement,
  rect: Pick<DOMRect, "height" | "left" | "top" | "width">,
) => {
  const domRect = {
    ...rect,
    bottom: rect.top + rect.height,
    right: rect.left + rect.width,
    toJSON: () => ({}),
    x: rect.left,
    y: rect.top,
  } as DOMRect;

  element.getBoundingClientRect = () => domRect;
};

const elementWithRect = (
  left: number,
  top: number,
  width: number,
  height: number,
) => {
  const element = document.createElement("div");

  setRect(element, { height, left, top, width });

  return element;
};

const TestTimedEventTarget: FC = () => {
  const register = useCallback((node: HTMLDivElement | null) => {
    if (!node) {
      return;
    }

    setRect(node, {
      height: 40,
      left: 0,
      top: 160,
      width: 320,
    });
    dayCalendarEventRegistry.register({
      element: node,
      eventId: timedEvent._id!,
      eventType: "timed",
    });
  }, []);

  return (
    <div data-testid="timed-source" ref={register}>
      <span data-testid="timed-child" />
    </div>
  );
};

let originalRequestAnimationFrame: typeof requestAnimationFrame;
let originalCancelAnimationFrame: typeof cancelAnimationFrame;
let flushFrame: (timestamp?: number) => void;

const installFrameScheduler = () => {
  const frames = new Map<number, FrameRequestCallback>();
  let nextFrameId = 1;

  originalRequestAnimationFrame = globalThis.requestAnimationFrame;
  originalCancelAnimationFrame = globalThis.cancelAnimationFrame;
  globalThis.requestAnimationFrame = ((callback: FrameRequestCallback) => {
    const frameId = nextFrameId;

    nextFrameId += 1;
    frames.set(frameId, callback);

    return frameId;
  }) as typeof requestAnimationFrame;
  globalThis.cancelAnimationFrame = ((frameId: number) => {
    frames.delete(frameId);
  }) as typeof cancelAnimationFrame;

  const flushFrame = (timestamp = 16) => {
    const [[frameId, callback]] = frames;

    if (!callback) {
      throw new Error("Expected a frame callback to be scheduled");
    }

    frames.delete(frameId);
    callback(timestamp);
  };

  return { flushFrame };
};

const openFloatingForm = (event: Schema_GridEvent) => {
  act(() => {
    draftActions.startGridClick(event);
    draftActions.setFormOpen(true);
  });
};

const isFormOpen = () => selectIsEventFormOpen(useDraftStore.getState());

const renderCoordinator = () => {
  const allDayColumnsElement = elementWithRect(0, 0, 320, 40);
  const mainGridElement = elementWithRect(0, 40, 320, 780);
  const timedColumnsElement = elementWithRect(0, 40, 320, 780);

  Object.defineProperty(mainGridElement, "clientHeight", { value: 780 });
  Object.defineProperty(mainGridElement, "scrollHeight", { value: 1560 });

  render(
    <DayInteractionCoordinator
      dateInView={dayjs("2026-05-20T00:00:00.000")}
      getLayoutSources={() => ({
        allDayColumnsElement,
        mainGridElement,
        timedColumnsElement,
      })}
      onOpenEvent={(event) => {
        draftActions.startGridClick(event);
        draftActions.setFormOpen(true);
      }}
      timedEvents={[timedEvent]}
    >
      <TestTimedEventTarget />
    </DayInteractionCoordinator>,
    { events: [timedEvent] },
  );
};

beforeEach(() => {
  ({ flushFrame } = installFrameScheduler());
});

afterEach(() => {
  cleanup();
  dayCalendarEventRegistry.clear();
  document.body.innerHTML = "";
  globalThis.requestAnimationFrame = originalRequestAnimationFrame;
  globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
});

describe("DayInteractionCoordinator", () => {
  it("closes an open Day event form when saved-event motion activates", () => {
    renderCoordinator();

    const child = screen.getByTestId("timed-child");

    openFloatingForm(timedEvent);
    fireEvent.pointerDown(child, {
      button: 0,
      clientX: 160,
      clientY: 160,
      isPrimary: true,
      pointerId: 1,
    });
    fireEvent.pointerMove(window, {
      clientX: 160,
      clientY: 220,
      pointerId: 1,
    });

    expect(isFormOpen()).toBe(false);
  });

  it("saves a moved event without opening a form", async () => {
    renderCoordinator();
    const child = screen.getByTestId("timed-child");

    fireEvent.pointerDown(child, {
      button: 0,
      clientX: 160,
      clientY: 160,
      isPrimary: true,
      pointerId: 1,
    });
    fireEvent.pointerMove(window, {
      clientX: 160,
      clientY: 220,
      pointerId: 1,
    });
    flushFrame();
    fireEvent.pointerUp(window, {
      clientX: 160,
      clientY: 220,
      pointerId: 1,
    });

    expect(isFormOpen()).toBe(false);
    expect(useDraftStore.getState().event).toBeNull();
  });

  it("opens the event form when pointer interaction does not move the event", async () => {
    renderCoordinator();
    const child = screen.getByTestId("timed-child");

    fireEvent.pointerDown(child, {
      button: 0,
      clientX: 160,
      clientY: 160,
      isPrimary: true,
      pointerId: 1,
    });
    fireEvent.pointerUp(window, {
      clientX: 160,
      clientY: 160,
      pointerId: 1,
    });

    await waitFor(() => {
      expect(isFormOpen()).toBe(true);
    });
    expect(useDraftStore.getState().event?._id).toBe(timedEvent._id);
  });
});
