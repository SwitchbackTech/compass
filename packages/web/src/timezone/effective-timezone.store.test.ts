import { act, renderHook } from "@testing-library/react";
import { getBrowserTimeZone } from "@web/common/utils/datetime/web.date.util";
import {
  resetEffectiveTimeZoneStoreForTests,
  setEffectiveTimeZoneForTests,
  useEffectiveTimeZone,
} from "@web/timezone/effective-timezone.store";
import { afterEach, describe, expect, it } from "bun:test";

const originalVisibilityState = document.visibilityState;

const readEffectiveTimeZone = () =>
  renderHook(useEffectiveTimeZone).result.current;

describe("effective-timezone.store", () => {
  afterEach(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: originalVisibilityState,
    });
    act(() => {
      resetEffectiveTimeZoneStoreForTests();
    });
  });

  it("defaults to the browser timezone", () => {
    expect(readEffectiveTimeZone()).toBe(getBrowserTimeZone());
  });

  it("notifies subscribers when the effective zone changes", () => {
    const { result, rerender } = renderHook(useEffectiveTimeZone);

    act(() => {
      setEffectiveTimeZoneForTests("America/Denver");
    });
    rerender();

    expect(result.current).toBe("America/Denver");
  });

  it("returns to the browser zone when the tab becomes visible", () => {
    act(() => {
      setEffectiveTimeZoneForTests("America/Denver");
    });

    const { result, rerender } = renderHook(useEffectiveTimeZone);
    expect(result.current).toBe("America/Denver");

    act(() => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "visible",
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    rerender();

    expect(result.current).toBe(getBrowserTimeZone());
  });
});
