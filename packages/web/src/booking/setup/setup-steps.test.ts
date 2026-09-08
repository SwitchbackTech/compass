import {
  nextSetupStep,
  prevSetupStep,
  visibleSetupSteps,
} from "@web/booking/setup/setup-steps";
import { describe, expect, it } from "bun:test";

describe("visibleSetupSteps", () => {
  it("hides destination for 0 or 1 writable calendars", () => {
    expect(visibleSetupSteps(0).map((step) => step.id)).toEqual([
      "address",
      "hours",
      "duration",
      "live",
    ]);
    expect(visibleSetupSteps(1).map((step) => step.id)).toEqual([
      "address",
      "hours",
      "duration",
      "live",
    ]);
  });

  it("shows destination for 2 writable calendars", () => {
    expect(visibleSetupSteps(2).map((step) => step.id)).toEqual([
      "address",
      "hours",
      "duration",
      "destination",
      "live",
    ]);
  });
});

describe("nextSetupStep and prevSetupStep", () => {
  const four = visibleSetupSteps(1);
  const five = visibleSetupSteps(2);

  it("clamps at the ends", () => {
    expect(nextSetupStep("live", four)).toBe("live");
    expect(prevSetupStep("address", four)).toBe("address");
    expect(nextSetupStep("live", five)).toBe("live");
    expect(prevSetupStep("address", five)).toBe("address");
  });

  it("walks the four-step path", () => {
    expect(nextSetupStep("address", four)).toBe("hours");
    expect(nextSetupStep("hours", four)).toBe("duration");
    expect(nextSetupStep("duration", four)).toBe("live");
    expect(prevSetupStep("live", four)).toBe("duration");
    expect(prevSetupStep("hours", four)).toBe("address");
  });

  it("inserts destination on the five-step path", () => {
    expect(nextSetupStep("duration", five)).toBe("destination");
    expect(nextSetupStep("destination", five)).toBe("live");
    expect(prevSetupStep("live", five)).toBe("destination");
  });
});
