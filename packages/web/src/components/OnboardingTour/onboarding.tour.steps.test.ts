import {
  getNextOnboardingStepId,
  getOnboardingTourSteps,
  getPreviousOnboardingStepId,
} from "@web/components/OnboardingTour/onboarding.tour.steps";
import { describe, expect, it } from "bun:test";

describe("onboarding tour steps", () => {
  it("keeps user-facing copy free of em dashes", () => {
    for (const step of getOnboardingTourSteps()) {
      expect(step.title).not.toContain("—");
      expect(step.body).not.toContain("—");
      if (step.shortcutHint) {
        const hint = Array.isArray(step.shortcutHint)
          ? step.shortcutHint.join(" ")
          : step.shortcutHint;
        expect(hint).not.toContain("—");
      }
    }
  });

  it("orders basics create → save → moveFocus → editSequence → palette → shortcuts → fork", () => {
    expect(getNextOnboardingStepId("create")).toBe("save");
    expect(getNextOnboardingStepId("save")).toBe("moveFocus");
    expect(getNextOnboardingStepId("moveFocus")).toBe("editSequence");
    expect(getNextOnboardingStepId("editSequence")).toBe("palette");
    expect(getNextOnboardingStepId("palette")).toBe("shortcuts");
    expect(getNextOnboardingStepId("shortcuts")).toBe("fork");
  });

  it("orders advanced fork → targetEvent → nudge → undo → done", () => {
    expect(getNextOnboardingStepId("fork")).toBe("targetEvent");
    expect(getNextOnboardingStepId("targetEvent")).toBe("nudge");
    expect(getNextOnboardingStepId("nudge")).toBe("undo");
    expect(getNextOnboardingStepId("undo")).toBe("done");
    expect(getNextOnboardingStepId("done")).toBeNull();
  });

  it("retreats one step at a time", () => {
    expect(getPreviousOnboardingStepId("create")).toBeNull();
    expect(getPreviousOnboardingStepId("save")).toBe("create");
    expect(getPreviousOnboardingStepId("nudge")).toBe("targetEvent");
  });

  it("trims unnecessary create/save copy", () => {
    const steps = getOnboardingTourSteps();
    const create = steps.find((step) => step.id === "create");
    const save = steps.find((step) => step.id === "save");

    expect(create?.body).not.toMatch(/click the grid/i);
    expect(save?.body).not.toMatch(/instantly/i);
  });

  it("renders multi-key hints as separate keycap tokens", () => {
    const steps = getOnboardingTourSteps();
    expect(
      steps.find((step) => step.id === "editSequence")?.shortcutHint,
    ).toEqual(["E", "T"]);
    expect(steps.find((step) => step.id === "palette")?.shortcutHint).toEqual([
      "Mod",
      "K",
    ]);
    expect(steps.find((step) => step.id === "undo")?.shortcutHint).toEqual([
      "Mod",
      "Z",
    ]);
    expect(steps.find((step) => step.id === "moveFocus")?.shortcutHint).toEqual(
      ["ArrowLeft", "ArrowUp", "ArrowDown", "ArrowRight"],
    );
  });

  it("keeps the fork non-questioning", () => {
    const fork = getOnboardingTourSteps().find((step) => step.id === "fork");
    expect(fork?.body).not.toMatch(/\?/);
    expect(fork?.body).toMatch(/skip anytime/i);
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

  it("points the finale at Hardcore Mode practice", () => {
    const done = getOnboardingTourSteps().find((step) => step.id === "done");

    expect(done?.body).toMatch(/anything with the keyboard/i);
    expect(done?.body).toMatch(/Shift Shift/i);
    expect(done?.body).toMatch(/Hardcore Mode/i);
    expect(done?.body).toMatch(/clicks/i);
    expect(done?.body).toMatch(/command palette/i);
    expect(done?.shortcutHint).toEqual(["Shift", "Shift"]);
  });
});
