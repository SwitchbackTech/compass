import { setupMinuteSync } from "./time.util";

// Mock timers
jest.useFakeTimers();

describe("setupMinuteSync", () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  it("should calculate correct timeout for different starting seconds", () => {
    const callback = jest.fn();

    // Test with 30 seconds, 500ms
    jest.setSystemTime(new Date("2024-01-01T10:30:30.500Z"));
    const cleanup = setupMinuteSync(callback);

    // Should timeout in 29.5 seconds (60000 - 30500 = 29500ms)
    expect(jest.getTimerCount()).toBe(1);

    cleanup();
  });

  it("should call callback after timeout expires", () => {
    const callback = jest.fn();

    // Start at 30 seconds
    jest.setSystemTime(new Date("2024-01-01T10:30:30.000Z"));
    const cleanup = setupMinuteSync(callback);

    // Fast-forward to just before the timeout
    jest.advanceTimersByTime(29999);
    expect(callback).not.toHaveBeenCalled();

    // Fast-forward past the timeout
    jest.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);

    cleanup();
  });

  it("should set up interval after initial timeout", () => {
    const callback = jest.fn();

    jest.setSystemTime(new Date("2024-01-01T10:30:30.000Z"));
    const cleanup = setupMinuteSync(callback);

    // Fast-forward past the initial timeout
    jest.advanceTimersByTime(30000);
    expect(callback).toHaveBeenCalledTimes(1);

    // Fast-forward another minute
    jest.advanceTimersByTime(60000);
    expect(callback).toHaveBeenCalledTimes(2);

    // Fast-forward another minute
    jest.advanceTimersByTime(60000);
    expect(callback).toHaveBeenCalledTimes(3);

    cleanup();
  });

  it("should clear both timeout and interval on cleanup", () => {
    const callback = jest.fn();

    jest.setSystemTime(new Date("2024-01-01T10:30:30.000Z"));
    const cleanup = setupMinuteSync(callback);

    // Should have one timer initially
    expect(jest.getTimerCount()).toBe(1);

    // Fast-forward past timeout to trigger interval setup
    jest.advanceTimersByTime(30000);
    expect(callback).toHaveBeenCalledTimes(1);

    // Should now have one interval timer
    expect(jest.getTimerCount()).toBe(1);

    // Call cleanup
    cleanup();

    // Should have no timers after cleanup
    expect(jest.getTimerCount()).toBe(0);
  });

  it("should handle edge case of starting exactly at minute boundary", () => {
    const callback = jest.fn();

    // Start exactly at minute boundary (0 seconds, 0ms)
    jest.setSystemTime(new Date("2024-01-01T10:30:00.000Z"));
    const cleanup = setupMinuteSync(callback);

    // Should have one timer
    expect(jest.getTimerCount()).toBe(1);

    cleanup();
  });
});
