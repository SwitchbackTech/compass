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

  it("keeps 'move' language, never reintroducing 'nudge'", () => {
    for (const step of getOnboardingTourSteps()) {
      expect(step.title.toLowerCase()).not.toContain("nudge");
      expect(step.body.toLowerCase()).not.toContain("nudge");
    }
  });

  it("orders Act 1 create → save → moveFocus → editSequence → fork", () => {
    expect(getNextOnboardingStepId("create")).toBe("save");
    expect(getNextOnboardingStepId("save")).toBe("moveFocus");
    expect(getNextOnboardingStepId("moveFocus")).toBe("editSequence");
    expect(getNextOnboardingStepId("editSequence")).toBe("fork");
  });

  it("orders Act 2 fork → targetEvent → move → resizeEdge → placeDraft → undo", () => {
    expect(getNextOnboardingStepId("fork")).toBe("targetEvent");
    expect(getNextOnboardingStepId("targetEvent")).toBe("move");
    expect(getNextOnboardingStepId("move")).toBe("resizeEdge");
    expect(getNextOnboardingStepId("resizeEdge")).toBe("placeDraft");
    expect(getNextOnboardingStepId("placeDraft")).toBe("undo");
  });

  it("orders Act 3: undo → hardcore, the graduation finale", () => {
    expect(getNextOnboardingStepId("undo")).toBe("hardcore");
    expect(getNextOnboardingStepId("hardcore")).toBeNull();
  });

  it("retreats one step at a time", () => {
    expect(getPreviousOnboardingStepId("create")).toBeNull();
    expect(getPreviousOnboardingStepId("save")).toBe("create");
    expect(getPreviousOnboardingStepId("move")).toBe("targetEvent");
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

  it("names the capstone mission target directly, not abstractly", () => {
    const steps = getOnboardingTourSteps();
    const targetEvent = steps.find((step) => step.id === "targetEvent");
    const move = steps.find((step) => step.id === "move");
    const resizeEdge = steps.find((step) => step.id === "resizeEdge");

    expect(targetEvent?.title).toMatch(/Dentist/);
    expect(targetEvent?.body).toMatch(/Dentist/);
    expect(move?.title).toMatch(/Dentist/);
    expect(move?.body).toMatch(/overlap/i);
    expect(resizeEdge?.body).toMatch(/Tab/);
    expect(resizeEdge?.body).toMatch(/start time stays put/i);
  });

  it("teaches placing a new draft via Shift+Arrow on empty focus", () => {
    const placeDraft = getOnboardingTourSteps().find(
      (step) => step.id === "placeDraft",
    );
    expect(placeDraft?.body).toMatch(/nothing focused/i);
    expect(placeDraft?.shortcutHint).toEqual(["Shift", "ArrowRight"]);
  });

  it("points the finale at Hardcore Mode as the graduation mission", () => {
    const hardcore = getOnboardingTourSteps().find(
      (step) => step.id === "hardcore",
    );

    expect(hardcore?.title).toMatch(/Graduate/i);
    expect(hardcore?.body).toMatch(/Shift twice/i);
    expect(hardcore?.body).toMatch(/keyboard-only/i);
    expect(hardcore?.body).toMatch(/clicks/i);
    expect(hardcore?.body).toMatch(/command palette/i);
    expect(hardcore?.shortcutHint).toEqual(["Shift", "Shift"]);
  });
});
