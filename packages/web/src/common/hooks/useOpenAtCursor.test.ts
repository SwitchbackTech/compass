import { type Placement, type Strategy } from "@floating-ui/react";
import { renderHook } from "@testing-library/react";
import { act } from "react";
import {
  CursorItem,
  closeFloatingAtCursor,
  isOpenAtCursor,
  nodeIdStore,
  openFloatingAtCursor,
  openStore,
  placementStore,
  referenceStore,
  setFloatingNodeIdAtCursor,
  setFloatingOpenAtCursor,
  setFloatingPlacementAtCursor,
  setFloatingReferenceAtCursor,
  setFloatingStrategyAtCursor,
  strategyStore,
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
        timeoutCallbacks.push(() => callback());
      }
      return timeoutCallbacks.length;
    }) as unknown as typeof setTimeout);

    // Reset state before each test
    openStore.set(false);
    nodeIdStore.set(null);
    placementStore.set("right-start");
    strategyStore.set("absolute");
    referenceStore.set(null);
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
      expect(openStore.get()).toBe(false);

      // Fast-forward microtasks and timers
      runAllTimers();

      expect(nodeIdStore.get()).toBe(config.nodeId);
      expect(placementStore.get()).toBe(config.placement);
      expect(strategyStore.get()).toBe(config.strategy);
      expect(referenceStore.get()).toBe(config.reference);
      expect(openStore.get()).toBe(true);
    });

    it("openFloatingAtCursor should close existing floating before opening new one", () => {
      // Set initial state
      openStore.set(true);
      nodeIdStore.set(CursorItem.EventForm);

      const element = document.createElement("div");
      openFloatingAtCursor({
        nodeId: CursorItem.EventPreview,
        reference: element,
      });

      // Should be closed immediately
      expect(openStore.get()).toBe(false);
      expect(nodeIdStore.get()).toBe(null);

      // Then opened after delay
      runAllTimers();

      expect(openStore.get()).toBe(true);
      expect(nodeIdStore.get()).toBe(CursorItem.EventPreview);
    });

    it("closeFloatingAtCursor should reset all values", () => {
      // Set some values first
      openStore.set(true);
      nodeIdStore.set(CursorItem.EventForm);
      placementStore.set("bottom");
      referenceStore.set(document.createElement("div"));

      closeFloatingAtCursor();

      expect(openStore.get()).toBe(false);
      expect(nodeIdStore.get()).toBe(null);
      expect(placementStore.get()).toBe("right-start");
      expect(referenceStore.get()).toBe(null);
    });

    it("isOpenAtCursor should return true only when open and nodeId matches", () => {
      // Case 1: Closed
      openStore.set(false);
      nodeIdStore.set(CursorItem.EventForm);
      expect(isOpenAtCursor(CursorItem.EventForm)).toBe(false);

      // Case 2: Open but different nodeId
      openStore.set(true);
      nodeIdStore.set(CursorItem.EventPreview);
      expect(isOpenAtCursor(CursorItem.EventForm)).toBe(false);

      // Case 3: Open and matching nodeId
      openStore.set(true);
      nodeIdStore.set(CursorItem.EventForm);
      expect(isOpenAtCursor(CursorItem.EventForm)).toBe(true);
    });
  });
});
