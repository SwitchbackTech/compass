import {
  nextSetupStep,
  prevSetupStep,
  setupStepProgress,
  visibleSetupSteps,
} from "@web/booking/setup/setup-steps";
import { describe, expect, it } from "bun:test";

describe("visibleSetupSteps", () => {
  it("omits destination for zero or one writable calendar", () => {
    expect(visibleSetupSteps(0)).toEqual([
      "address",
      "hours",
      "duration",
      "live",
    ]);
    expect(visibleSetupSteps(1)).toEqual([
      "address",
      "hours",
      "duration",
      "live",
    ]);
  });

  it("includes destination for two or more writable calendars", () => {
    expect(visibleSetupSteps(2)).toEqual([
      "address",
      "hours",
      "duration",
      "destination",
      "live",
    ]);
  });
});

describe("nextSetupStep", () => {
  it("advances through visible steps and clamps at the end", () => {
    expect(nextSetupStep("address", 1)).toBe("hours");
    expect(nextSetupStep("hours", 1)).toBe("duration");
    expect(nextSetupStep("duration", 1)).toBe("live");
    expect(nextSetupStep("live", 1)).toBeNull();
  });

  it("includes destination when multiple writable calendars exist", () => {
    expect(nextSetupStep("duration", 2)).toBe("destination");
    expect(nextSetupStep("destination", 2)).toBe("live");
    expect(nextSetupStep("live", 2)).toBeNull();
  });
});

describe("prevSetupStep", () => {
  it("steps back through visible steps and clamps at the start", () => {
    expect(prevSetupStep("address", 1)).toBeNull();
    expect(prevSetupStep("hours", 1)).toBe("address");
    expect(prevSetupStep("duration", 1)).toBe("hours");
    expect(prevSetupStep("live", 1)).toBe("duration");
  });

  it("includes destination when multiple writable calendars exist", () => {
    expect(prevSetupStep("live", 2)).toBe("destination");
    expect(prevSetupStep("destination", 2)).toBe("duration");
  });
});

describe("setupStepProgress", () => {
  it("reports step numbers against the visible list", () => {
    expect(setupStepProgress("address", 1)).toEqual({ current: 1, total: 4 });
    expect(setupStepProgress("live", 2)).toEqual({ current: 5, total: 5 });
    expect(setupStepProgress("duration", 2)).toEqual({ current: 3, total: 5 });
  });
});
