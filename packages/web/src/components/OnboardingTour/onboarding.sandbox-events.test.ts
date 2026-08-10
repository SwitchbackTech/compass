import { CalendarIdSchema } from "@core/types/domain-primitives";
import dayjs from "@core/util/date/dayjs";
import { createObjectIdString } from "@web/common/utils/id/object-id.util";
import {
  buildSandboxEventData,
  isSandboxStep,
  mergeSandboxEventData,
} from "@web/components/OnboardingTour/onboarding.sandbox-events";
import { describe, expect, it } from "bun:test";

const calendarId = CalendarIdSchema.parse(createObjectIdString());
const anchor = dayjs("2026-08-10T00:00:00-05:00");

describe("isSandboxStep", () => {
  it("is true only for moveFocus/editSequence/targetEvent/nudge", () => {
    expect(isSandboxStep("moveFocus")).toBe(true);
    expect(isSandboxStep("editSequence")).toBe(true);
    expect(isSandboxStep("targetEvent")).toBe(true);
    expect(isSandboxStep("nudge")).toBe(true);
    expect(isSandboxStep("create")).toBe(false);
    expect(isSandboxStep("fork")).toBe(false);
    expect(isSandboxStep("done")).toBe(false);
  });
});

describe("buildSandboxEventData", () => {
  it("returns undefined for a non-sandbox step", () => {
    expect(
      buildSandboxEventData("create", anchor, calendarId, "UTC"),
    ).toBeUndefined();
  });

  it("marks every moveFocus event read-only", () => {
    const data = buildSandboxEventData("moveFocus", anchor, calendarId, "UTC");
    expect(data).toBeDefined();
    expect(data!.ids.length).toBeGreaterThan(0);
    expect(data!.sandboxReadOnlyEventIds).toEqual(data!.ids);
  });

  it("leaves the nudge event mutable (the one lesson that teaches a mutation)", () => {
    const data = buildSandboxEventData("nudge", anchor, calendarId, "UTC");
    expect(data).toBeDefined();
    expect(data!.ids.length).toBe(1);
    expect(data!.sandboxReadOnlyEventIds).toEqual([]);
  });

  it("anchors every event to the given day and calendar", () => {
    const data = buildSandboxEventData(
      "targetEvent",
      anchor,
      calendarId,
      "UTC",
    );
    for (const id of data!.ids) {
      const event = data!.entities[id];
      expect(event.calendarId).toBe(calendarId);
      expect(event.schedule.kind).toBe("timed");
      if (event.schedule.kind === "timed") {
        expect(dayjs(event.schedule.start).isSame(anchor, "day")).toBe(true);
      }
    }
  });
});

describe("mergeSandboxEventData", () => {
  const realId = "real-event-id" as never;
  const real = {
    ids: [realId],
    entities: { [realId]: { id: realId } } as never,
  };

  it("returns the real data unchanged when there is nothing to splice", () => {
    expect(mergeSandboxEventData(real, undefined)).toBe(real);
  });

  it("returns the sandbox data unchanged when there is no real data yet", () => {
    const sandbox = buildSandboxEventData("nudge", anchor, calendarId, "UTC");
    expect(mergeSandboxEventData(undefined, sandbox)).toBe(sandbox);
  });

  it("splices sandbox events onto real data without dropping either", () => {
    const sandbox = buildSandboxEventData(
      "moveFocus",
      anchor,
      calendarId,
      "UTC",
    )!;
    const merged = mergeSandboxEventData(real, sandbox)!;
    expect(merged.ids).toEqual([realId, ...sandbox.ids]);
    expect(merged.entities[realId]).toBeDefined();
    for (const id of sandbox.ids) {
      expect(merged.entities[id]).toBeDefined();
    }
    expect(merged.sandboxReadOnlyEventIds).toEqual(sandbox.ids);
  });
});
