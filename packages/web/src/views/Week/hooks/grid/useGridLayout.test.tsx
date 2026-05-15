import { render, screen, waitFor } from "@testing-library/react";
import { type FC, useRef } from "react";
import { Provider } from "react-redux";
import { store } from "@web/store";
import { useGridLayout } from "./useGridLayout";
import { afterEach, describe, expect, it } from "bun:test";

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

const renderHarness = () =>
  render(
    <Provider store={store}>
      <GridLayoutHarness />
    </Provider>,
  );

describe("useGridLayout", () => {
  afterEach(() => {
    window.__weekInteractionV2MotionActive = false;
  });

  it("measures grid elements from callback refs and derives column widths", async () => {
    observers.length = 0;
    window.ResizeObserver =
      TestResizeObserver as unknown as typeof ResizeObserver;
    globalThis.ResizeObserver =
      TestResizeObserver as unknown as typeof ResizeObserver;

    renderHarness();

    await waitFor(() => {
      expect(screen.getByTestId("hour-height")).toHaveTextContent(
        "59.23076923076923",
      );
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
      expect(screen.getByTestId("hour-height")).toHaveTextContent(
        "59.23076923076923",
      );
    });

    const before = Number(screen.getByTestId("render-count").textContent);

    triggerResize(screen.getByTestId("main-grid"));
    triggerResize(screen.getByTestId("all-day-columns"));

    await Promise.resolve();

    expect(Number(screen.getByTestId("render-count").textContent)).toBe(before);
  });

  it("ignores ResizeObserver updates while V2 owns pointer motion", async () => {
    observers.length = 0;
    window.ResizeObserver =
      TestResizeObserver as unknown as typeof ResizeObserver;
    globalThis.ResizeObserver =
      TestResizeObserver as unknown as typeof ResizeObserver;

    renderHarness();

    await waitFor(() => {
      expect(screen.getByTestId("hour-height")).toHaveTextContent(
        "59.23076923076923",
      );
    });

    const mainGrid = screen.getByTestId("main-grid");
    const before = Number(screen.getByTestId("render-count").textContent);
    setRect(mainGrid, { width: 700, height: 880 });
    window.__weekInteractionV2MotionActive = true;

    triggerResize(mainGrid);

    await Promise.resolve();

    expect(screen.getByTestId("hour-height")).toHaveTextContent(
      "59.23076923076923",
    );
    expect(Number(screen.getByTestId("render-count").textContent)).toBe(before);
  });
});
