import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { ONBOARDING_STEPS } from "../constants/onboarding.constants";
import { markStepCompleted } from "../utils/onboarding.storage.util";
import { GuideProgressIndicator } from "./GuideProgressIndicator";

describe("GuideProgressIndicator", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should render step text", () => {
    render(
      <GuideProgressIndicator
        actualStep={ONBOARDING_STEPS.NAVIGATE_TO_DAY}
        showSuccessMessage={false}
        stepText="Step 1 of 7"
      />,
    );

    expect(screen.getByText("Step 1 of 7")).toBeInTheDocument();
  });

  it("should render 7 progress dots", () => {
    render(
      <GuideProgressIndicator
        actualStep={ONBOARDING_STEPS.NAVIGATE_TO_DAY}
        showSuccessMessage={false}
        stepText="Step 1 of 7"
      />,
    );

    const dots = screen
      .getByText("Step 1 of 7")
      .parentElement?.querySelectorAll("div[class*='rounded-full']");
    expect(dots).toHaveLength(7);
  });

  it("should show completed steps with accent color", () => {
    markStepCompleted(ONBOARDING_STEPS.NAVIGATE_TO_DAY);
    markStepCompleted(ONBOARDING_STEPS.CREATE_TASK);

    const { container } = render(
      <GuideProgressIndicator
        actualStep={ONBOARDING_STEPS.NAVIGATE_TO_NOW}
        showSuccessMessage={false}
        stepText="Step 3 of 7"
      />,
    );

    const dots = container.querySelectorAll("div[class*='rounded-full']");
    // First two dots should be completed (bg-accent-primary without opacity)
    expect(dots[0]).toHaveClass("bg-accent-primary");
    expect(dots[0]).not.toHaveClass("opacity-50");
    expect(dots[1]).toHaveClass("bg-accent-primary");
    expect(dots[1]).not.toHaveClass("opacity-50");
  });

  it("should show current step with opacity", () => {
    markStepCompleted(ONBOARDING_STEPS.NAVIGATE_TO_DAY);

    const { container } = render(
      <GuideProgressIndicator
        actualStep={ONBOARDING_STEPS.CREATE_TASK}
        showSuccessMessage={false}
        stepText="Step 2 of 7"
      />,
    );

    const dots = container.querySelectorAll("div[class*='rounded-full']");
    // Second dot should be current (bg-accent-primary with opacity-50)
    expect(dots[1]).toHaveClass("bg-accent-primary");
    expect(dots[1]).toHaveClass("opacity-50");
  });

  it("should show all steps as completed when showing success message", () => {
    const { container } = render(
      <GuideProgressIndicator
        actualStep={null}
        showSuccessMessage={true}
        stepText="All steps completed"
      />,
    );

    expect(screen.getByText("All steps completed")).toBeInTheDocument();

    const dots = container.querySelectorAll("div[class*='rounded-full']");
    dots.forEach((dot) => {
      expect(dot).toHaveClass("bg-accent-primary");
      expect(dot).not.toHaveClass("opacity-50");
    });
  });

  it("should show incomplete steps with border color", () => {
    const { container } = render(
      <GuideProgressIndicator
        actualStep={ONBOARDING_STEPS.NAVIGATE_TO_DAY}
        showSuccessMessage={false}
        stepText="Step 1 of 7"
      />,
    );

    const dots = container.querySelectorAll("div[class*='rounded-full']");
    // Last few dots should be incomplete (bg-border-primary)
    expect(dots[6]).toHaveClass("bg-border-primary");
  });
});
