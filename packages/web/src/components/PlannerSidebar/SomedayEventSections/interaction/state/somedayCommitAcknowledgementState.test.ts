import { act, renderHook } from "@testing-library/react";
import {
  __resetSomedayCommitAcknowledgementState,
  markSomedayCommitAcknowledgement,
  useSomedayCommitAcknowledgement,
} from "./somedayCommitAcknowledgementState";
import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";

describe("somedayCommitAcknowledgementState", () => {
  let setTimeoutSpy: ReturnType<typeof spyOn>;
  let clearTimeoutSpy: ReturnType<typeof spyOn>;
  let currentTimeoutId = 0;
  const activeTimeouts = new Map<number, () => void>();

  beforeEach(() => {
    currentTimeoutId = 0;
    activeTimeouts.clear();

    setTimeoutSpy = spyOn(globalThis, "setTimeout").mockImplementation(((
      callback: TimerHandler,
    ) => {
      const id = ++currentTimeoutId;

      if (typeof callback === "function") {
        activeTimeouts.set(id, () => callback());
      }

      return id;
    }) as unknown as typeof setTimeout);

    clearTimeoutSpy = spyOn(globalThis, "clearTimeout").mockImplementation(((
      id?: number,
    ) => {
      if (id !== undefined) {
        activeTimeouts.delete(id);
      }
    }) as unknown as typeof clearTimeout);
  });

  afterEach(() => {
    act(() => {
      __resetSomedayCommitAcknowledgementState();
    });
    setTimeoutSpy.mockRestore();
    clearTimeoutSpy.mockRestore();
  });

  const expireNextMark = () => {
    const callback = activeTimeouts.values().next().value;

    if (callback) {
      callback();
    }
  };

  it("exposes a marked event id until the acknowledgement expires", () => {
    const { result } = renderHook(() =>
      useSomedayCommitAcknowledgement("event-1"),
    );

    expect(result.current).toBe(false);

    act(() => {
      markSomedayCommitAcknowledgement("event-1");
    });

    expect(result.current).toBe(true);

    act(() => {
      expireNextMark();
    });

    expect(result.current).toBe(false);
  });

  it("resets active acknowledgement timers", () => {
    const { result } = renderHook(() =>
      useSomedayCommitAcknowledgement("event-1"),
    );

    act(() => {
      markSomedayCommitAcknowledgement("event-1");
    });

    expect(result.current).toBe(true);

    act(() => {
      __resetSomedayCommitAcknowledgementState();
    });

    expect(result.current).toBe(false);
    expect(activeTimeouts.size).toBe(0);
  });
});
