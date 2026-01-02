import { act, renderHook, waitFor } from "@testing-library/react";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { markStepCompleted } from "../utils/onboardingStorage.util";
import { useStep4Detection } from "./useStep4Detection";

describe("useStep4Detection", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("should detect when reminder is edited", async () => {
    const onStepComplete = jest.fn();

    // Set initial reminder value
    localStorage.setItem(STORAGE_KEYS.REMINDER, "Initial reminder");

    renderHook(() =>
      useStep4Detection({
        currentStep: 4,
        onStepComplete,
      }),
    );

    // Wait for hook to initialize
    await waitFor(() => {
      expect(localStorage.getItem(STORAGE_KEYS.REMINDER)).toBe(
        "Initial reminder",
      );
    });

    // Update reminder
    act(() => {
      localStorage.setItem(STORAGE_KEYS.REMINDER, "Updated reminder");
    });

    // Advance timers to trigger polling
    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(onStepComplete).toHaveBeenCalledTimes(1);
    });
  });

  it("should detect when reminder changes from empty to non-empty", async () => {
    const onStepComplete = jest.fn();

    // Set initial empty reminder
    localStorage.setItem(STORAGE_KEYS.REMINDER, "");

    renderHook(() =>
      useStep4Detection({
        currentStep: 4,
        onStepComplete,
      }),
    );

    await waitFor(() => {
      expect(localStorage.getItem(STORAGE_KEYS.REMINDER)).toBe("");
    });

    // Update reminder to non-empty
    act(() => {
      localStorage.setItem(STORAGE_KEYS.REMINDER, "New reminder");
    });

    // Advance timers to trigger polling
    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(onStepComplete).toHaveBeenCalledTimes(1);
    });
  });

  it("should not trigger when reminder is empty after change", async () => {
    const onStepComplete = jest.fn();

    localStorage.setItem(STORAGE_KEYS.REMINDER, "Initial reminder");

    renderHook(() =>
      useStep4Detection({
        currentStep: 4,
        onStepComplete,
      }),
    );

    await waitFor(() => {
      expect(localStorage.getItem(STORAGE_KEYS.REMINDER)).toBe(
        "Initial reminder",
      );
    });

    // Update reminder to empty (should not trigger completion)
    act(() => {
      localStorage.setItem(STORAGE_KEYS.REMINDER, "");
    });

    // Advance timers multiple times
    act(() => {
      jest.advanceTimersByTime(500);
    });
    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(
      () => {
        expect(onStepComplete).not.toHaveBeenCalled();
      },
      { timeout: 100 },
    );
  });

  it("should not trigger when not on step 4", async () => {
    const onStepComplete = jest.fn();

    localStorage.setItem(STORAGE_KEYS.REMINDER, "Initial reminder");

    renderHook(() =>
      useStep4Detection({
        currentStep: 3,
        onStepComplete,
      }),
    );

    // Update reminder
    act(() => {
      localStorage.setItem(STORAGE_KEYS.REMINDER, "Updated reminder");
    });

    // Advance timers
    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(
      () => {
        expect(onStepComplete).not.toHaveBeenCalled();
      },
      { timeout: 100 },
    );
  });

  it("should not trigger when step is already completed", async () => {
    const onStepComplete = jest.fn();

    markStepCompleted(4);
    localStorage.setItem(STORAGE_KEYS.REMINDER, "Initial reminder");

    renderHook(() =>
      useStep4Detection({
        currentStep: 4,
        onStepComplete,
      }),
    );

    // Update reminder
    act(() => {
      localStorage.setItem(STORAGE_KEYS.REMINDER, "Updated reminder");
    });

    // Advance timers
    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(
      () => {
        expect(onStepComplete).not.toHaveBeenCalled();
      },
      { timeout: 100 },
    );
  });

  it("should initialize reminder value correctly when step 4 becomes active", async () => {
    const onStepComplete = jest.fn();

    localStorage.setItem(STORAGE_KEYS.REMINDER, "Initial reminder");

    const { rerender } = renderHook(
      ({ currentStep }) =>
        useStep4Detection({
          currentStep,
          onStepComplete,
        }),
      {
        initialProps: { currentStep: 3 },
      },
    );

    // Change to step 4
    rerender({ currentStep: 4 });

    await waitFor(() => {
      expect(localStorage.getItem(STORAGE_KEYS.REMINDER)).toBe(
        "Initial reminder",
      );
    });

    // Update reminder after step 4 is active
    act(() => {
      localStorage.setItem(STORAGE_KEYS.REMINDER, "Updated reminder");
    });

    // Advance timers
    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(onStepComplete).toHaveBeenCalledTimes(1);
    });
  });

  it("should reset when switching away from step 4", async () => {
    const onStepComplete = jest.fn();

    localStorage.setItem(STORAGE_KEYS.REMINDER, "Initial reminder");

    const { rerender } = renderHook(
      ({ currentStep }) =>
        useStep4Detection({
          currentStep,
          onStepComplete,
        }),
      {
        initialProps: { currentStep: 4 },
      },
    );

    await waitFor(() => {
      expect(localStorage.getItem(STORAGE_KEYS.REMINDER)).toBe(
        "Initial reminder",
      );
    });

    // Switch away from step 4
    rerender({ currentStep: 3 });

    // Update reminder (should not trigger since we're not on step 4)
    act(() => {
      localStorage.setItem(STORAGE_KEYS.REMINDER, "Updated reminder");
    });

    // Advance timers
    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(
      () => {
        expect(onStepComplete).not.toHaveBeenCalled();
      },
      { timeout: 100 },
    );
  });

  it("should only call onStepComplete once even if reminder changes multiple times", async () => {
    const onStepComplete = jest.fn();

    localStorage.setItem(STORAGE_KEYS.REMINDER, "Initial reminder");

    renderHook(() =>
      useStep4Detection({
        currentStep: 4,
        onStepComplete,
      }),
    );

    await waitFor(() => {
      expect(localStorage.getItem(STORAGE_KEYS.REMINDER)).toBe(
        "Initial reminder",
      );
    });

    // Update reminder multiple times
    act(() => {
      localStorage.setItem(STORAGE_KEYS.REMINDER, "First update");
    });
    act(() => {
      jest.advanceTimersByTime(500);
    });

    act(() => {
      localStorage.setItem(STORAGE_KEYS.REMINDER, "Second update");
    });
    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(onStepComplete).toHaveBeenCalledTimes(1);
    });
  });

  it("should handle null currentStep", async () => {
    const onStepComplete = jest.fn();

    localStorage.setItem(STORAGE_KEYS.REMINDER, "Initial reminder");

    renderHook(() =>
      useStep4Detection({
        currentStep: null,
        onStepComplete,
      }),
    );

    // Update reminder
    act(() => {
      localStorage.setItem(STORAGE_KEYS.REMINDER, "Updated reminder");
    });

    // Advance timers
    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(
      () => {
        expect(onStepComplete).not.toHaveBeenCalled();
      },
      { timeout: 100 },
    );
  });
});
