import {
  type ClampZoneRect,
  clampPointToZones,
} from "@web/components/PlannerSidebar/SomedayEventSections/interaction/adapter/geometry/clampPointToZones";
import { describe, expect, it } from "bun:test";

const sidebar: ClampZoneRect = { bottom: 500, left: 0, right: 200, top: 0 };
const allDay: ClampZoneRect = { bottom: 90, left: 300, right: 800, top: 50 };
const grid: ClampZoneRect = { bottom: 800, left: 300, right: 800, top: 100 };
const zones = [sidebar, allDay, grid];

describe("clampPointToZones", () => {
  it("returns the point unchanged when inside a zone", () => {
    expect(clampPointToZones({ x: 400, y: 300 }, zones)).toEqual({
      x: 400,
      y: 300,
    });
  });

  it("returns the point unchanged when there are no zones", () => {
    expect(clampPointToZones({ x: 999, y: -50 }, [])).toEqual({
      x: 999,
      y: -50,
    });
  });

  it("clamps a point above the grid down to the nearest zone", () => {
    // Above the all-day row (the header band): snap to the all-day top edge.
    expect(clampPointToZones({ x: 400, y: 20 }, zones)).toEqual({
      x: 400,
      y: 50,
    });
  });

  it("clamps into the gap between zones to the nearest edge", () => {
    // y=96 sits between the all-day bottom (90) and grid top (100);
    // the all-day row is closer.
    expect(clampPointToZones({ x: 400, y: 93 }, zones)).toEqual({
      x: 400,
      y: 90,
    });
  });

  it("picks the nearest of multiple zones", () => {
    // Between sidebar (right=200) and grid (left=300), nearer the sidebar.
    expect(clampPointToZones({ x: 220, y: 300 }, zones)).toEqual({
      x: 200,
      y: 300,
    });

    // Same band, nearer the grid.
    expect(clampPointToZones({ x: 290, y: 300 }, zones)).toEqual({
      x: 300,
      y: 300,
    });
  });

  it("clamps both axes at a corner", () => {
    expect(clampPointToZones({ x: 900, y: 900 }, zones)).toEqual({
      x: 800,
      y: 800,
    });
  });
});
