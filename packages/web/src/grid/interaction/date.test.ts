import { act } from "react";
import { getLocalMinutes } from "@web/grid/interaction/date";
import {
  resetEffectiveTimeZoneStoreForTests,
  setPinnedTimeZone,
} from "@web/timezone/effective-timezone.store";
import { afterEach, describe, expect, it } from "bun:test";

describe("getLocalMinutes", () => {
  afterEach(() => {
    act(() => {
      resetEffectiveTimeZoneStoreForTests();
    });
  });

  it("reads minutes of day in the pinned timezone", () => {
    act(() => {
      setPinnedTimeZone("America/Chicago");
    });

    // 09:00 UTC is 04:00 CDT on 2026-05-20.
    expect(getLocalMinutes("2026-05-20T09:00:00.000Z")).toBe(4 * 60);
  });
});
