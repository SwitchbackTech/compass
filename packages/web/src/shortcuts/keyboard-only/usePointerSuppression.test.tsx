import { renderHook } from "@testing-library/react";
import { POINTER_BLOCK_EVENT_TYPES } from "@web/shortcuts/keyboard-only/pointer-block";
import { usePointerSuppression } from "@web/shortcuts/keyboard-only/usePointerSuppression";
import { afterEach, describe, expect, it, spyOn } from "bun:test";

let addEventListenerSpy: ReturnType<
  typeof spyOn<Window, "addEventListener">
> | null = null;

const UA = {
  iphone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  mac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
} as const;

const originalUserAgent = navigator.userAgent;

const setUserAgent = (value: string) => {
  Object.defineProperty(window.navigator, "userAgent", {
    value,
    configurable: true,
    writable: true,
  });
};

const setUserAgentData = (value: { mobile: boolean } | undefined) => {
  Object.defineProperty(window.navigator, "userAgentData", {
    value,
    configurable: true,
    writable: true,
  });
};

const capturePointerListenerCalls = (
  add: ReturnType<typeof spyOn<Window, "addEventListener">>,
) =>
  add.mock.calls.filter(([type, , options]) => {
    const isPointerType = (
      POINTER_BLOCK_EVENT_TYPES as readonly string[]
    ).includes(String(type));
    return isPointerType && options === true;
  });

afterEach(() => {
  setUserAgent(originalUserAgent);
  setUserAgentData(undefined);
  addEventListenerSpy?.mockRestore();
  addEventListenerSpy = null;
});

describe("usePointerSuppression", () => {
  it("does not capture pointer events on a phone so MobileGate can be tapped", () => {
    setUserAgent(UA.iphone);
    setUserAgentData(undefined);
    addEventListenerSpy = spyOn(window, "addEventListener");

    const { unmount } = renderHook(() => usePointerSuppression());

    expect(capturePointerListenerCalls(addEventListenerSpy)).toHaveLength(0);
    unmount();
  });

  it("captures pointer events on desktop", () => {
    setUserAgent(UA.mac);
    setUserAgentData({ mobile: false });
    addEventListenerSpy = spyOn(window, "addEventListener");

    const { unmount } = renderHook(() => usePointerSuppression());

    expect(capturePointerListenerCalls(addEventListenerSpy).length).toBe(
      POINTER_BLOCK_EVENT_TYPES.length,
    );
    unmount();
  });
});
