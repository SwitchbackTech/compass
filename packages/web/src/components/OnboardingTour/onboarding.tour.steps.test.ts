import {
  getNextOnboardingStepId,
  getOnboardingTourSteps,
} from "@web/components/OnboardingTour/onboarding.tour.steps";
import { describe, expect, it } from "bun:test";

describe("onboarding tour steps", () => {
  it("keeps user-facing copy free of em dashes", () => {
    for (const step of getOnboardingTourSteps()) {
      expect(step.title).not.toContain("—");
      expect(step.body).not.toContain("—");
      if (step.shortcutHint) {
        expect(step.shortcutHint).not.toContain("—");
      }
    }
  });

  it("orders steps create → save → palette → shortcuts → done", () => {
    expect(getNextOnboardingStepId("create")).toBe("save");
    expect(getNextOnboardingStepId("save")).toBe("palette");
    expect(getNextOnboardingStepId("palette")).toBe("shortcuts");
    expect(getNextOnboardingStepId("shortcuts")).toBe("done");
    expect(getNextOnboardingStepId("done")).toBeNull();
  });
});
