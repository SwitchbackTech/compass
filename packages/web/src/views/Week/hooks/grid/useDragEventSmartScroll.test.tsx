import { fireEvent, render, screen } from "@testing-library/react";
import { type ComponentProps, type FC, useCallback, useRef } from "react";
import { Origin, Priorities } from "@core/constants/core.constants";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { DraftContext } from "@web/views/Week/components/Draft/context/DraftContext";
import { useDragEventSmartScroll } from "./useDragEventSmartScroll";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

type DraftContextValue = NonNullable<
  ComponentProps<typeof DraftContext.Provider>["value"]
>;

const originalRequestAnimationFrame = window.requestAnimationFrame;
const originalCancelAnimationFrame = window.cancelAnimationFrame;
let animationFrames = new Map<number, FrameRequestCallback>();
let nextAnimationFrameId = 0;

const createTimedDraft = (): Schema_GridEvent => ({
  _id: "event-1",
  title: "Seed event",
  startDate: "2024-01-15T10:00:00.000Z",
  endDate: "2024-01-15T11:00:00.000Z",
  isAllDay: false,
  isSomeday: false,
  origin: Origin.COMPASS,
  priority: Priorities.UNASSIGNED,
  user: "user-1",
  position: {
    isOverlapping: false,
    totalEventsInGroup: 1,
    widthMultiplier: 1,
    horizontalOrder: 1,
    dragOffset: { x: 0, y: 0 },
    initialX: null,
    initialY: null,
  },
});

const createDraftContextValue = (): DraftContextValue =>
  ({
    actions: {},
    confirmation: {},
    setters: {},
    state: {
      dateBeingChanged: "endDate",
      draft: createTimedDraft(),
      dragStatus: null,
      formProps: {},
      isDragging: true,
      isFormOpen: false,
      isFormOpenBeforeDragging: null,
      isResizing: false,
      resizeStatus: null,
    },
  }) as DraftContextValue;

const flushAnimationFrames = () => {
  const callbacks = Array.from(animationFrames.values());
  animationFrames = new Map();

  for (const callback of callbacks) {
    callback(performance.now());
  }
};

const SmartScrollGrid: FC = () => {
  const renderCountRef = useRef(0);
  const mainGridRef = useRef<HTMLDivElement | null>(null);
  renderCountRef.current += 1;

  useDragEventSmartScroll(mainGridRef);

  const attachMainGrid = useCallback((node: HTMLDivElement | null) => {
    if (!node || mainGridRef.current === node) return;

    Object.defineProperty(node, "clientHeight", {
      configurable: true,
      value: 400,
    });
    Object.defineProperty(node, "scrollHeight", {
      configurable: true,
      value: 1200,
    });
    node.scrollTop = 200;
    node.getBoundingClientRect = () =>
      ({
        bottom: 1000,
        height: 1100,
        left: 0,
        right: 700,
        top: -100,
        width: 700,
        x: 0,
        y: -100,
      }) as DOMRect;

    mainGridRef.current = node;
  }, []);

  return (
    <>
      <div data-testid="main-grid" ref={attachMainGrid} />
      <output data-testid="render-count">{renderCountRef.current}</output>
    </>
  );
};

const SmartScrollHarness: FC = () => {
  return (
    <DraftContext.Provider value={createDraftContextValue()}>
      <SmartScrollGrid />
    </DraftContext.Provider>
  );
};

describe("useDragEventSmartScroll", () => {
  beforeEach(() => {
    animationFrames = new Map();
    nextAnimationFrameId = 0;

    const requestAnimationFrameMock = mock((callback: FrameRequestCallback) => {
      nextAnimationFrameId += 1;
      animationFrames.set(nextAnimationFrameId, callback);
      return nextAnimationFrameId;
    });
    const cancelAnimationFrameMock = mock((id: number) => {
      animationFrames.delete(id);
    });

    window.requestAnimationFrame = requestAnimationFrameMock;
    window.cancelAnimationFrame = cancelAnimationFrameMock;
    globalThis.requestAnimationFrame = requestAnimationFrameMock;
    globalThis.cancelAnimationFrame = cancelAnimationFrameMock;
  });

  afterEach(() => {
    window.requestAnimationFrame = originalRequestAnimationFrame;
    window.cancelAnimationFrame = originalCancelAnimationFrame;
    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
  });

  it("scrolls timed drags without re-rendering when the pointer moves", () => {
    render(<SmartScrollHarness />);

    flushAnimationFrames();
    const grid = screen.getByTestId("main-grid");
    const renderCountBeforeMove =
      screen.getByTestId("render-count").textContent;
    const scrollTopBeforeMove = grid.scrollTop;

    fireEvent.mouseMove(window, { clientX: 320, clientY: 880 });
    flushAnimationFrames();

    expect(grid.scrollTop).toBeGreaterThan(scrollTopBeforeMove);
    expect(screen.getByTestId("render-count").textContent).toBe(
      renderCountBeforeMove,
    );
  });
});
