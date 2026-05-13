import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { type FC, useEffect, useRef, useState } from "react";
import { Provider } from "react-redux";
import { store } from "@web/store";
import { useGridLayout } from "./useGridLayout";
import { describe, expect, it } from "bun:test";

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

const setRect = (node: HTMLElement, rect: Partial<DOMRectReadOnly>) => {
  const next = {
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: rect.width ?? 0,
    bottom: rect.height ?? 0,
    width: 0,
    height: 0,
    ...rect,
  };

  node.getBoundingClientRect = () => next as DOMRect;
};

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
      <div
        data-testid="all-day-row"
        ref={(node) => {
          if (!node) {
            gridRefs.allDayRowRef(null);
            return;
          }
          setRect(node, { width: 700, height: 48 });
          gridRefs.allDayRowRef(node);
        }}
      />
      <div
        data-testid="all-day-columns"
        ref={(node) => {
          if (!node) {
            gridRefs.allDayRef(null);
            return;
          }
          Object.defineProperty(node, "clientWidth", {
            configurable: true,
            value: 700,
          });
          setRect(node, { width: 700, height: 48 });
          gridRefs.allDayRef(node);
        }}
      />
      <div
        data-testid="main-grid"
        ref={(node) => {
          if (!node) {
            gridRefs.mainGridElementRef(null);
            return;
          }
          setRect(node, { width: 700, height: 770 });
          gridRefs.mainGridElementRef(node);
        }}
      />
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

const GridLayoutStabilityHarness: FC = () => {
  const [renderCount, setRenderCount] = useState(0);
  const previous = useRef<ReturnType<typeof useGridLayout> | null>(null);
  const { gridRefs, measurements } = useGridLayout();

  const isMeasured =
    measurements.hourHeight === 70 && measurements.colWidths.length === 7;
  const isSameMeasurements =
    previous.current && isMeasured
      ? previous.current.measurements === measurements
      : null;
  const isSameGridRefs =
    previous.current && isMeasured
      ? previous.current.gridRefs === gridRefs
      : null;
  const isSameColWidths =
    previous.current && isMeasured
      ? previous.current.measurements.colWidths === measurements.colWidths
      : null;

  useEffect(() => {
    if (isMeasured) {
      previous.current = { gridRefs, measurements };
    }
  }, [gridRefs, isMeasured, measurements]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setRenderCount((count) => count + 1)}
      >
        rerender {renderCount}
      </button>
      <div
        data-testid="stable-all-day-row"
        ref={(node) => {
          if (!node) {
            gridRefs.allDayRowRef(null);
            return;
          }
          setRect(node, { width: 700, height: 48 });
          gridRefs.allDayRowRef(node);
        }}
      />
      <div
        data-testid="stable-all-day-columns"
        ref={(node) => {
          if (!node) {
            gridRefs.allDayRef(null);
            return;
          }
          setRect(node, { width: 700, height: 48 });
          gridRefs.allDayRef(node);
        }}
      />
      <div
        data-testid="stable-main-grid"
        ref={(node) => {
          if (!node) {
            gridRefs.mainGridElementRef(null);
            return;
          }
          setRect(node, { width: 700, height: 770 });
          gridRefs.mainGridElementRef(node);
        }}
      />
      <output data-testid="stable-hour-height">
        {measurements.hourHeight.toString()}
      </output>
      <output data-testid="same-measurements">
        {isSameMeasurements === null
          ? "pending"
          : isSameMeasurements.toString()}
      </output>
      <output data-testid="same-grid-refs">
        {isSameGridRefs === null ? "pending" : isSameGridRefs.toString()}
      </output>
      <output data-testid="same-col-widths">
        {isSameColWidths === null ? "pending" : isSameColWidths.toString()}
      </output>
    </div>
  );
};

const renderHarness = () =>
  render(
    <Provider store={store}>
      <GridLayoutHarness />
    </Provider>,
  );

describe("useGridLayout", () => {
  it("measures grid elements from callback refs and derives column widths", async () => {
    observers.length = 0;
    window.ResizeObserver =
      TestResizeObserver as unknown as typeof ResizeObserver;
    globalThis.ResizeObserver =
      TestResizeObserver as unknown as typeof ResizeObserver;

    renderHarness();

    await waitFor(() => {
      expect(screen.getByTestId("hour-height")).toHaveTextContent("70");
      expect(screen.getByTestId("col-widths")).toHaveTextContent(
        "100,100,100,100,100,100,100",
      );
    });
  });

  it("does not re-render when ResizeObserver reports unchanged measurements", async () => {
    observers.length = 0;
    window.ResizeObserver =
      TestResizeObserver as unknown as typeof ResizeObserver;
    globalThis.ResizeObserver =
      TestResizeObserver as unknown as typeof ResizeObserver;

    renderHarness();

    await waitFor(() => {
      expect(screen.getByTestId("hour-height")).toHaveTextContent("70");
    });

    const before = Number(screen.getByTestId("render-count").textContent);

    triggerResize(screen.getByTestId("main-grid"));
    triggerResize(screen.getByTestId("all-day-columns"));

    await Promise.resolve();

    expect(Number(screen.getByTestId("render-count").textContent)).toBe(before);
  });

  it("keeps layout objects stable across parent re-renders when measurements do not change", async () => {
    observers.length = 0;
    window.ResizeObserver =
      TestResizeObserver as unknown as typeof ResizeObserver;
    globalThis.ResizeObserver =
      TestResizeObserver as unknown as typeof ResizeObserver;

    render(
      <Provider store={store}>
        <GridLayoutStabilityHarness />
      </Provider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("stable-hour-height")).toHaveTextContent("70");
    });

    fireEvent.click(screen.getByRole("button", { name: /rerender/i }));

    await waitFor(() => {
      expect(screen.getByTestId("same-measurements")).toHaveTextContent("true");
      expect(screen.getByTestId("same-grid-refs")).toHaveTextContent("true");
      expect(screen.getByTestId("same-col-widths")).toHaveTextContent("true");
    });
  });
});
