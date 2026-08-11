import { renderHook } from "@testing-library/react";
import { useTrialStatus } from "@web/billing/useTrialStatus";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import { beforeEach, describe, expect, it } from "bun:test";

const daysAgo = (days: number) =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

describe("useTrialStatus", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts the clock on first use and reports a full trial", () => {
    const { result } = renderHook(() => useTrialStatus());

    expect(result.current.isExpired).toBe(false);
    expect(result.current.daysLeft).toBe(7);
    expect(result.current.isAnonymousTrial).toBe(true);
    expect(
      persistentBrowserStore.get(STORAGE_KEYS.TRIAL_STARTED_AT),
    ).toBeTruthy();
  });

  it("counts down without expiring inside the window", () => {
    persistentBrowserStore.set(STORAGE_KEYS.TRIAL_STARTED_AT, daysAgo(5));

    const { result } = renderHook(() => useTrialStatus());

    expect(result.current.daysLeft).toBe(2);
    expect(result.current.isExpired).toBe(false);
  });

  it("expires once the window has passed", () => {
    persistentBrowserStore.set(STORAGE_KEYS.TRIAL_STARTED_AT, daysAgo(8));

    const { result } = renderHook(() => useTrialStatus());

    expect(result.current.daysLeft).toBe(0);
    expect(result.current.isExpired).toBe(true);
  });

  // Regression: `authenticated` from SessionContext is false until the async
  // SuperTokens check resolves, so it cannot be the only guard. Someone who
  // tried Compass anonymously, signed up, and kept the same browser still has
  // a stale trial.started-at; gating on the context alone flashed "your trial
  // has ended" at them on every load.
  it("never gates a user who has authenticated before, despite a stale expired clock", () => {
    persistentBrowserStore.set(STORAGE_KEYS.TRIAL_STARTED_AT, daysAgo(30));
    localStorage.setItem(
      STORAGE_KEYS.AUTH,
      JSON.stringify({ hasAuthenticated: true }),
    );

    const { result } = renderHook(() => useTrialStatus());

    expect(result.current.isExpired).toBe(false);
    expect(result.current.isAnonymousTrial).toBe(false);
  });
});
