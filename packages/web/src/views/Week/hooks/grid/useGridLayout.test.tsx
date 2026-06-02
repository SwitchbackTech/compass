import { configureStore } from "@reduxjs/toolkit";
import { act, render, screen } from "@testing-library/react";
import { type FC, useRef } from "react";
import { Provider } from "react-redux";
import { createInitialState } from "@web/__tests__/utils/state/store.test.util";
import { reducers } from "@web/store/reducers";
import { setWeekInteractionMotionActive } from "@web/views/Week/interaction/state/weekInteractionMotionState";
import { useGridLayout } from "./useGridLayout";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";

type ObserverRecord = {
  node: Element;
  callback: ResizeObserverCallback;
};

const observers: ObserverRecord[] = [];

class TestResizeObserver implements ResizeObserver {
  private callback: ResizeObserverCallback;
  disconnect = () => {};
  observe = (node: Element) => {
    observers.push({
      node,
      callback: this.callback,
    });
  };
  unobserve = () => {};

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
}

// Test-specific rect dimensions
const TEST_RECTS: Record<string, { width: number; height: number }> = {
  "all-day-row": { width: 700, height: 48 },
  "all-day-columns": { width: 700, height: 48 },
  "main-grid": { width: 700, height: 910 },
};

// Custom getBoundingClientRect implementation for tests
function testGetBoundingClientRect(this: HTMLElement): DOMRect {
  const testId = this.getAttribute?.("data-testid");
  if (testId && TEST_RECTS[testId]) {
    const { width, height } = TEST_RECTS[testId];
    return {
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: width,
      bottom: height,
      width,
      height,
      toJSON: () => ({}),
    } as DOMRect;
  }
  // Return zero rect for unknown elements
  return {
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    toJSON: () => ({}),
  } as DOMRect;
}

const triggerResize = (node: Element) => {
  for (const observer of observers.filter((entry) => entry.node === node)) {
    observer.callback([], observer as unknown as ResizeObserver);
  }
};

const GridLayoutHarness: FC = () => {
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;

  const { gridRefs, measurements } = useGridLayout();

  return (
    <div>
      <div data-testid="all-day-row" ref={gridRefs.allDayRowRef} />
      <div data-testid="all-day-columns" ref={gridRefs.allDayRef} />
      <div data-testid="main-grid" ref={gridRefs.mainGridElementRef} />
      <output data-testid="render-count">{renderCountRef.current}</output>
      <output data-testid="hour-height">
        {measurements.hourHeight.toString()}
      </output>
      <output data-testid="col-widths">
        {measurements.colWidths.join(",")}
      </output>
    </div>
  );
};

const createStore = () =>
  configureStore({
    preloadedState: createInitialState(),
    reducer: reducers,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        immutableCheck: false,
        serializableCheck: false,
        thunk: false,
      }),
  });

const renderHarness = () => {
  const store = createStore();

  return render(
    <Provider store={store}>
      <GridLayoutHarness />
    </Provider>,
  );
};

beforeEach(() => {
  observers.length = 0;
  setWeekInteractionMotionActive(false);

  // Override getBoundingClientRect on both prototypes since JSDOM may use
  // window.HTMLElement internally while tests may reference globalThis.HTMLElement
  HTMLElement.prototype.getBoundingClientRect = testGetBoundingClientRect;
  if (
    typeof window !== "undefined" &&
    window.HTMLElement?.prototype &&
    window.HTMLElement !== HTMLElement
  ) {
    window.HTMLElement.prototype.getBoundingClientRect =
      testGetBoundingClientRect;
  }

  window.ResizeObserver =
    TestResizeObserver as unknown as typeof ResizeObserver;
  globalThis.ResizeObserver =
    TestResizeObserver as unknown as typeof ResizeObserver;
});

afterEach(() => {
  setWeekInteractionMotionActive(false);
});

describe("useGridLayout", () => {
  it("measures grid elements from callback refs and derives column widths", async () => {
    await act(async () => {
      renderHarness();
    });

    // Wait for React to process state updates
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    const hourHeight = screen.getByTestId("hour-height").textContent;
    const colWidths = screen.getByTestId("col-widths").textContent;

    // Expected values: hourHeight = 910 / 13 = 70, colWidths = 700 / 7 = 100 each
    expect(hourHeight).toBe("70");
    expect(colWidths).toBe("100,100,100,100,100,100,100");
  });

  it("does not re-render when ResizeObserver reports unchanged measurements", async () => {
    await act(async () => {
      renderHarness();
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    // Verify initial measurements are set
    expect(screen.getByTestId("hour-height").textContent).toBe("70");

    const before = Number(screen.getByTestId("render-count").textContent);

    await act(async () => {
      triggerResize(screen.getByTestId("main-grid"));
      triggerResize(screen.getByTestId("all-day-columns"));
    });

    expect(Number(screen.getByTestId("render-count").textContent)).toBe(before);
  });
});
