import { eventPositionInParityGridFrame } from "@web/desktop-export/export-fixtures/parity-grid-frame";
import { GRID_MARGIN_LEFT } from "@web/grid/grid.constants";
import { describe, expect, it } from "bun:test";

describe("eventPositionInParityGridFrame", () => {
  it("adds the time gutter for macOS parity vectors", () => {
    const trackRelative = { height: 57, left: 5, top: 480, width: 310 };
    expect(eventPositionInParityGridFrame(trackRelative)).toEqual({
      ...trackRelative,
      left: 5 + GRID_MARGIN_LEFT,
    });
  });
});
