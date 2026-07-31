import { act, renderHook } from "@testing-library/react";
import {
  clearAppLockReasons,
  setAppLockReason,
  useAppLockReason,
} from "@web/shortcuts/app-lock";
import { afterEach, describe, expect, it } from "bun:test";

afterEach(() => {
  clearAppLockReasons();
});

describe("app-lock", () => {
  it("sets and clears dataset.appLocked from named reasons", () => {
    setAppLockReason("a", true);
    expect(document.body.dataset.appLocked).toBe("true");

    setAppLockReason("b", true);
    setAppLockReason("a", false);
    expect(document.body.dataset.appLocked).toBe("true");

    setAppLockReason("b", false);
    expect(document.body.dataset.appLocked).toBeUndefined();
  });

  it("useAppLockReason syncs with locked and cleans up on unmount", () => {
    const { rerender, unmount } = renderHook(
      ({ locked }) => useAppLockReason("hook", locked),
      { initialProps: { locked: true } },
    );

    expect(document.body.dataset.appLocked).toBe("true");

    act(() => {
      rerender({ locked: false });
    });
    expect(document.body.dataset.appLocked).toBeUndefined();

    act(() => {
      rerender({ locked: true });
    });
    expect(document.body.dataset.appLocked).toBe("true");

    unmount();
    expect(document.body.dataset.appLocked).toBeUndefined();
  });
});
