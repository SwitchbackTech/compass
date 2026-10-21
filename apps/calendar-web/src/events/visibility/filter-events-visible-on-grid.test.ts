import {
  filterEventsVisibleOnGrid,
  isEventVisibleOnGrid,
} from "./filter-events-visible-on-grid";
import { describe, expect, it } from "bun:test";

describe("filterEventsVisibleOnGrid", () => {
  const visible = { _id: "visible" };
  const hidden = { _id: "hidden" };
  const hiddenIds = new Set(["hidden"]);

  it("keeps events that are not individually hidden", () => {
    expect(isEventVisibleOnGrid(visible, hiddenIds)).toBe(true);
    expect(filterEventsVisibleOnGrid([visible, hidden], hiddenIds)).toEqual([
      visible,
    ]);
  });

  it("returns an empty list when every event is hidden", () => {
    expect(filterEventsVisibleOnGrid([hidden], hiddenIds)).toEqual([]);
  });
});
