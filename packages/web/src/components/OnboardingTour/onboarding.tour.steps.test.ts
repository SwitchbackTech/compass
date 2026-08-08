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

  it("keeps palette and shortcuts lessons non-contradictory", () => {
    const steps = getOnboardingTourSteps();
    const palette = steps.find((step) => step.id === "palette");
    const shortcuts = steps.find((step) => step.id === "shortcuts");

    expect(palette?.body).toMatch(/close with Escape/i);
    expect(palette?.body).not.toMatch(/Show keyboard shortcuts/i);
    expect(shortcuts?.body).toMatch(/from the calendar/i);
    expect(shortcuts?.shortcutHint).toBe("?");
  });

  it("points the finale at keyboard-only practice", () => {
    const done = getOnboardingTourSteps().find((step) => step.id === "done");

    expect(done?.body).toMatch(/anything with the keyboard/i);
    expect(done?.body).toMatch(/Shift Shift/i);
    expect(done?.body).toMatch(/clicks/i);
    expect(done?.body).toMatch(/command palette/i);
    expect(done?.shortcutHint).toBe("Shift Shift");
  });
});
