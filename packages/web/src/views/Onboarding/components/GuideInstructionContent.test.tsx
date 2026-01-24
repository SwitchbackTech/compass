import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { OnboardingInstructionPart } from "../types/onboarding.guide.types";
import {
  GuideInstructionContent,
  GuideSuccessMessage,
} from "./GuideInstructionContent";

describe("GuideInstructionContent", () => {
  it("should render text parts as spans", () => {
    const parts: OnboardingInstructionPart[] = [
      { type: "text", value: "Hello world" },
    ];

    render(<GuideInstructionContent instructionParts={parts} />);

    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("should render kbd parts as kbd elements", () => {
    const parts: OnboardingInstructionPart[] = [{ type: "kbd", value: "c" }];

    const { container } = render(
      <GuideInstructionContent instructionParts={parts} />,
    );

    const kbd = container.querySelector("kbd");
    expect(kbd).toBeInTheDocument();
    expect(kbd).toHaveTextContent("c");
  });

  it("should render mixed instruction parts correctly", () => {
    const parts: OnboardingInstructionPart[] = [
      { type: "text", value: "Press " },
      { type: "kbd", value: "2" },
      { type: "text", value: " to go to the Day view" },
    ];

    const { container } = render(
      <GuideInstructionContent instructionParts={parts} />,
    );

    // Check full text content
    expect(container.textContent).toBe("Press 2 to go to the Day view");

    const kbd = container.querySelector("kbd");
    expect(kbd).toHaveTextContent("2");

    // Check individual span elements
    const spans = container.querySelectorAll("span");
    expect(spans).toHaveLength(2);
  });

  it("should apply correct styles to kbd elements", () => {
    const parts: OnboardingInstructionPart[] = [{ type: "kbd", value: "c" }];

    const { container } = render(
      <GuideInstructionContent instructionParts={parts} />,
    );

    const kbd = container.querySelector("kbd");
    expect(kbd).toHaveClass("bg-bg-secondary");
    expect(kbd).toHaveClass("text-text-light");
    expect(kbd).toHaveClass("font-mono");
  });

  it("should handle empty instruction parts", () => {
    const { container } = render(
      <GuideInstructionContent instructionParts={[]} />,
    );

    expect(container.textContent).toBe("");
  });
});

describe("GuideSuccessMessage", () => {
  it("should render success message text", () => {
    render(<GuideSuccessMessage />);

    expect(screen.getByText(/You're all set!/)).toBeInTheDocument();
  });
});
