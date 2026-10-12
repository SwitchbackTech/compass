import { type CaptureResult } from "posthog-js";
import { filterPosthogCalendarGridGestures } from "@web/auth/posthog/posthog-grid-gesture-filter.util";
import { describe, expect, it } from "bun:test";

const gridGesture = (
  event: string,
  properties: Record<string, unknown>,
): CaptureResult =>
  ({
    uuid: "test",
    event,
    properties,
  }) as CaptureResult;

describe("filterPosthogCalendarGridGestures", () => {
  it("drops dead clicks on the timed grid", () => {
    expect(
      filterPosthogCalendarGridGestures(
        gridGesture("$dead_click", {
          $elements_chain: "div#mainGrid;th;",
        }),
      ),
    ).toBeNull();
  });

  it("drops rage clicks on grid columns", () => {
    expect(
      filterPosthogCalendarGridGestures(
        gridGesture("$rageclick", {
          $elements_chain: "th;attr__data-grid-date=2026-05-20;",
        }),
      ),
    ).toBeNull();
  });

  it("keeps dead clicks on chrome", () => {
    const event = gridGesture("$dead_click", {
      $elements_chain: "button;attr__id=nextWeek;",
    });
    expect(filterPosthogCalendarGridGestures(event)).toBe(event);
  });

  it("passes through unrelated events", () => {
    const event = gridGesture("pointer_hint_shown", {
      $elements_chain: "div#mainGrid;",
    });
    expect(filterPosthogCalendarGridGestures(event)).toBe(event);
  });
});
