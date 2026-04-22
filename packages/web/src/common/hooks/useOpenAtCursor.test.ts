import { type Placement, type Strategy } from "@floating-ui/react";
import { renderHook } from "@testing-library/react";
import { act } from "react";
import {
  CursorItem,
  closeFloatingAtCursor,
  isOpenAtCursor,
  nodeId$,
  open$,
  openFloatingAtCursor,
  placement$,
  reference$,
  setFloatingNodeIdAtCursor,
  setFloatingOpenAtCursor,
  setFloatingPlacementAtCursor,
  setFloatingReferenceAtCursor,
  setFloatingStrategyAtCursor,
  strategy$,
  useFloatingNodeIdAtCursor,
  useFloatingOpenAtCursor,
  useFloatingPlacementAtCursor,
  useFloatingReferenceAtCursor,
  useFloatingStrategyAtCursor,
} from "./useOpenAtCursor";
import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";

describe("useOpenAtCursor", () => {
  let setTimeoutSpy: ReturnType<typeof spyOn>;
  let timeoutCallbacks: Array<() => void> = [];

  beforeEach(() => {
    timeoutCallbacks = [];
    setTimeoutSpy = spyOn(globalThis, "setTimeout").mockImplementation(((
      callback: TimerHandler,
    ) => {
      if (typeof callback === "function") {
        timeoutCallbacks.push(callback);
      }
      return timeoutCallbacks.length;
    }) as typeof setTimeout);

    // Reset state before each test
    open$.next(false);
    nodeId$.next(null);
    placement$.next("right-start");
    strategy$.next("absolute");
    reference$.next(null);
  });

  afterEach(() => {
    setTimeoutSpy.mockRestore();
  });

  const runAllTimers = () => {
    for (const callback of timeoutCallbacks) {
      callback();
    }
    timeoutCallbacks = [];
  };

  describe("Hooks", () => {
    it("useFloatingOpenAtCursor should return current open state", () => {
      const { result } = renderHook(() => useFloatingOpenAtCursor());
      expect(result.current).toBe(false);

      act(() => {
        setFloatingOpenAtCursor(true);
      });

      expect(result.current).toBe(true);
    });

    it("useFloatingNodeIdAtCursor should return current nodeId", () => {
      const { result } = renderHook(() => useFloatingNodeIdAtCursor());
      expect(result.current).toBe(null);

      act(() => {
        setFloatingNodeIdAtCursor(CursorItem.EventForm);
      });

      expect(result.current).toBe(CursorItem.EventForm);
    });

    it("useFloatingPlacementAtCursor should return current placement", () => {
      const { result } = renderHook(() => useFloatingPlacementAtCursor());
      expect(result.current).toBe("right-start");

      const newPlacement: Placement = "bottom-end";
      act(() => {
        setFloatingPlacementAtCursor(newPlacement);
      });

      expect(result.current).toBe(newPlacement);
    });

    it("useFloatingStrategyAtCursor should return current strategy", () => {
      const { result } = renderHook(() => useFloatingStrategyAtCursor());
      expect(result.current).toBe("absolute");

      const newStrategy: Strategy = "fixed";
      act(() => {
        setFloatingStrategyAtCursor(newStrategy);
      });

      expect(result.current).toBe(newStrategy);
    });

    it("useFloatingReferenceAtCursor should return current reference", () => {
      const { result } = renderHook(() => useFloatingReferenceAtCursor());
      expect(result.current).toBe(null);

      const element = document.createElement("div");
      act(() => {
        setFloatingReferenceAtCursor(element);
      });

      expect(result.current).toBe(element);
    });
  });

  describe("Functions", () => {
    it("openFloatingAtCursor should set all values correctly after delay", () => {
      const element = document.createElement("div");
      const config = {
        nodeId: CursorItem.EventPreview,
        reference: element,
        placement: "top" as Placement,
        strategy: "fixed" as Strategy,
      };

      openFloatingAtCursor(config);

      // Initially shouldn't be set due to timeout
      expect(open$.getValue()).toBe(false);

      // Fast-forward microtasks and timers
      runAllTimers();

      expect(nodeId$.getValue()).toBe(config.nodeId);
      expect(placement$.getValue()).toBe(config.placement);
      expect(strategy$.getValue()).toBe(config.strategy);
      expect(reference$.getValue()).toBe(config.reference);
      expect(open$.getValue()).toBe(true);
    });

    it("openFloatingAtCursor should close existing floating before opening new one", () => {
      // Set initial state
      open$.next(true);
      nodeId$.next(CursorItem.EventForm);

      const element = document.createElement("div");
      openFloatingAtCursor({
        nodeId: CursorItem.EventPreview,
        reference: element,
      });

      // Should be closed immediately
      expect(open$.getValue()).toBe(false);
      expect(nodeId$.getValue()).toBe(null);

      // Then opened after delay
      runAllTimers();

      expect(open$.getValue()).toBe(true);
      expect(nodeId$.getValue()).toBe(CursorItem.EventPreview);
    });

    it("closeFloatingAtCursor should reset all values", () => {
      // Set some values first
      open$.next(true);
      nodeId$.next(CursorItem.EventForm);
      placement$.next("bottom");
      reference$.next(document.createElement("div"));

      closeFloatingAtCursor();

      expect(open$.getValue()).toBe(false);
      expect(nodeId$.getValue()).toBe(null);
      expect(placement$.getValue()).toBe("right-start");
      expect(reference$.getValue()).toBe(null);
    });

    it("isOpenAtCursor should return true only when open and nodeId matches", () => {
      // Case 1: Closed
      open$.next(false);
      nodeId$.next(CursorItem.EventForm);
      expect(isOpenAtCursor(CursorItem.EventForm)).toBe(false);

      // Case 2: Open but different nodeId
      open$.next(true);
      nodeId$.next(CursorItem.EventPreview);
      expect(isOpenAtCursor(CursorItem.EventForm)).toBe(false);

      // Case 3: Open and matching nodeId
      open$.next(true);
      nodeId$.next(CursorItem.EventForm);
      expect(isOpenAtCursor(CursorItem.EventForm)).toBe(true);
    });
  });
});
