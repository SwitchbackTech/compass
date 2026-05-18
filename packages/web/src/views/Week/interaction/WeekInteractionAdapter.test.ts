import { type AnyAction } from "@reduxjs/toolkit";
import { WeekInteractionAdapter } from "./WeekInteractionAdapter";
import {
  createMeasuredWeekInteractionDispatch,
  createWeekInteractionRuntimeMetrics,
  recordWeekInteractionRender,
} from "./WeekInteractionMetrics";
import { describe, expect, it, mock } from "bun:test";

const pointerEvent = () => new PointerEvent("pointerdown", { pointerId: 1 });

describe("WeekInteractionAdapter", () => {
  it("refuses pointer ownership in passive mode", () => {
    const adapter = new WeekInteractionAdapter({ mode: "passive" });

    expect(adapter.handlePointerDown(pointerEvent())).toEqual({
      reason: "passive-week-adapter",
      shouldOwn: false,
    });
    expect(adapter.getMetrics()).toMatchObject({
      ownedPointerDowns: 0,
      pointerDowns: 1,
    });
  });

  it("documents that all Week surfaces stay with existing owners in passive mode", () => {
    const adapter = new WeekInteractionAdapter();

    expect(adapter.getOwnershipMatrix()).toEqual([
      expect.objectContaining({
        newOwner: "existing-week-path",
        surface: "savedTimedDrag",
      }),
      expect.objectContaining({
        newOwner: "existing-week-path",
        surface: "savedTimedResize",
      }),
      expect.objectContaining({
        newOwner: "existing-week-path",
        surface: "savedAllDayDrag",
      }),
      expect.objectContaining({
        newOwner: "existing-week-path",
        surface: "savedAllDayResize",
      }),
      expect.objectContaining({
        newOwner: "existing-week-path",
        surface: "pendingEvent",
      }),
      expect.objectContaining({
        newOwner: "existing-week-path",
        surface: "draftEvent",
      }),
      expect.objectContaining({
        newOwner: "existing-week-path",
        surface: "emptyGridSelection",
      }),
      expect.objectContaining({
        newOwner: "existing-week-path",
        surface: "emptyGridDraftCreation",
      }),
      expect.objectContaining({
        newOwner: "existing-week-path",
        surface: "somedaySidebarDrop",
      }),
      expect.objectContaining({
        newOwner: "existing-week-path",
        surface: "formUi",
      }),
    ]);
  });

  it("documents the active Week surfaces owned by the calendar interaction engine", () => {
    const adapter = new WeekInteractionAdapter({ mode: "active" });

    expect(adapter.getOwnershipMatrix()).toEqual([
      expect.objectContaining({
        newOwner: "week-interaction-adapter",
        surface: "savedTimedDrag",
      }),
      expect.objectContaining({
        newOwner: "week-interaction-adapter",
        surface: "savedTimedResize",
      }),
      expect.objectContaining({
        newOwner: "week-interaction-adapter",
        surface: "savedAllDayDrag",
      }),
      expect.objectContaining({
        newOwner: "week-interaction-adapter",
        surface: "savedAllDayResize",
      }),
      expect.objectContaining({
        newOwner: "existing-week-path",
        surface: "pendingEvent",
      }),
      expect.objectContaining({
        newOwner: "existing-week-path",
        surface: "draftEvent",
      }),
      expect.objectContaining({
        newOwner: "existing-week-path",
        surface: "emptyGridSelection",
      }),
      expect.objectContaining({
        newOwner: "existing-week-path",
        surface: "emptyGridDraftCreation",
      }),
      expect.objectContaining({
        newOwner: "existing-week-path",
        surface: "somedaySidebarDrop",
      }),
      expect.objectContaining({
        newOwner: "existing-week-path",
        surface: "formUi",
      }),
    ]);
  });
});

describe("WeekInteractionMetrics", () => {
  it("records React and Redux boundary work separately", () => {
    const metrics = createWeekInteractionRuntimeMetrics();
    const dispatch = mock((action: AnyAction) => action);
    const measuredDispatch = createMeasuredWeekInteractionDispatch(
      dispatch,
      metrics,
    );
    const action = { type: "week/test" };

    recordWeekInteractionRender(metrics);
    measuredDispatch(action);

    expect(metrics.reactCommits).toBe(1);
    expect(metrics.reduxDispatches).toBe(1);
    expect(dispatch).toHaveBeenCalledWith(action);
  });
});
