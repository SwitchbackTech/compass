import { setupMinuteSync } from "./time.util";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  setSystemTime,
  spyOn,
} from "bun:test";

describe("setupMinuteSync", () => {
  const intervalId = {} as ReturnType<typeof setInterval>;
  const timeoutId = {} as ReturnType<typeof setTimeout>;

  let clearIntervalSpy: ReturnType<typeof spyOn>;
  let clearTimeoutSpy: ReturnType<typeof spyOn>;
  let intervalCallback: (() => void) | undefined;
  let setIntervalSpy: ReturnType<typeof spyOn>;
  let setTimeoutSpy: ReturnType<typeof spyOn>;
  let timeoutCallback: (() => void) | undefined;

  beforeEach(() => {
    intervalCallback = undefined;
    timeoutCallback = undefined;

    clearIntervalSpy = spyOn(globalThis, "clearInterval");
    clearTimeoutSpy = spyOn(globalThis, "clearTimeout");
    setIntervalSpy = spyOn(globalThis, "setInterval").mockImplementation(((
      callback: TimerHandler,
    ) => {
      if (typeof callback === "function") {
        intervalCallback = () => callback();
      }
      return intervalId;
    }) as typeof setInterval);
    setTimeoutSpy = spyOn(globalThis, "setTimeout").mockImplementation(((
      callback: TimerHandler,
    ) => {
      if (typeof callback === "function") {
        timeoutCallback = () => callback();
      }
      return timeoutId;
    }) as typeof setTimeout);
  });

  afterEach(() => {
    setSystemTime();
    clearIntervalSpy.mockRestore();
    clearTimeoutSpy.mockRestore();
    setIntervalSpy.mockRestore();
    setTimeoutSpy.mockRestore();
  });

  it("should calculate correct timeout for different starting seconds", () => {
    const callback = mock();

    // Test with 30 seconds, 500ms
    setSystemTime(new Date("2024-01-01T10:30:30.500Z"));
    const cleanup = setupMinuteSync(callback);

    // Should timeout in 29.5 seconds (60000 - 30500 = 29500ms)
    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    expect(setTimeoutSpy.mock.calls[0]?.[1]).toBe(29500);

    cleanup();
  });

  it("should call callback after timeout expires", () => {
    const callback = mock();

    // Start at 30 seconds
    setSystemTime(new Date("2024-01-01T10:30:30.000Z"));
    const cleanup = setupMinuteSync(callback);

    // Do not run the captured timeout until the boundary is reached.
    expect(callback).not.toHaveBeenCalled();

    timeoutCallback?.();
    expect(callback).toHaveBeenCalledTimes(1);

    cleanup();
  });

  it("should set up interval after initial timeout", () => {
    const callback = mock();

    setSystemTime(new Date("2024-01-01T10:30:30.000Z"));
    const cleanup = setupMinuteSync(callback);

    timeoutCallback?.();
    expect(callback).toHaveBeenCalledTimes(1);
    expect(setIntervalSpy).toHaveBeenCalledWith(callback, 60000);

    intervalCallback?.();
    expect(callback).toHaveBeenCalledTimes(2);

    intervalCallback?.();
    expect(callback).toHaveBeenCalledTimes(3);

    cleanup();
  });

  it("should clear both timeout and interval on cleanup", () => {
    const callback = mock();

    setSystemTime(new Date("2024-01-01T10:30:30.000Z"));
    const cleanup = setupMinuteSync(callback);

    // Should have one timer initially
    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    expect(setIntervalSpy).not.toHaveBeenCalled();

    // Trigger the interval setup
    timeoutCallback?.();
    expect(callback).toHaveBeenCalledTimes(1);

    // Should now have one interval timer
    expect(setIntervalSpy).toHaveBeenCalledWith(callback, 60000);

    cleanup();

    expect(clearTimeoutSpy).toHaveBeenCalledWith(timeoutId);
    expect(clearIntervalSpy).toHaveBeenCalledWith(intervalId);
  });

  it("should handle edge case of starting exactly at minute boundary", () => {
    const callback = mock();

    // Start exactly at minute boundary (0 seconds, 0ms)
    setSystemTime(new Date("2024-01-01T10:30:00.000Z"));
    const cleanup = setupMinuteSync(callback);

    // Should have one timer
    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    expect(setTimeoutSpy.mock.calls[0]?.[1]).toBe(60000);

    cleanup();
  });
});
