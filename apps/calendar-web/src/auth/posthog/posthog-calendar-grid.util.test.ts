import { isPosthogEventOnCalendarGrid } from "@web/auth/posthog/posthog-calendar-grid.util";
import { describe, expect, it } from "bun:test";

describe("isPosthogEventOnCalendarGrid", () => {
  it("matches mainGrid in the elements chain", () => {
    expect(
      isPosthogEventOnCalendarGrid({
        $elements_chain: "div#mainGrid;section;",
      }),
    ).toBe(true);
  });

  it("matches data-grid-date columns in the elements chain", () => {
    expect(
      isPosthogEventOnCalendarGrid({
        $elements_chain: "th;attr__data-grid-date=2026-05-20;",
      }),
    ).toBe(true);
  });

  it("ignores unrelated clicks", () => {
    expect(
      isPosthogEventOnCalendarGrid({
        $elements_chain: "button;attr__id=sidebarToggle;",
      }),
    ).toBe(false);
  });

  it("matches an all-day column id in autocaptured elements", () => {
    expect(
      isPosthogEventOnCalendarGrid({
        $elements: [{ attr__id: "allDayColumns" }],
      }),
    ).toBe(true);
  });

  it("matches a timed grid row attribute in autocaptured elements", () => {
    expect(
      isPosthogEventOnCalendarGrid({
        $elements: [{ "attr__data-calendar-timed-grid-row": "12" }],
      }),
    ).toBe(true);
  });

  it("ignores autocaptured elements outside the grid", () => {
    expect(
      isPosthogEventOnCalendarGrid({
        $elements: [{ attr__id: "sidebarToggle" }],
      }),
    ).toBe(false);
  });
});
