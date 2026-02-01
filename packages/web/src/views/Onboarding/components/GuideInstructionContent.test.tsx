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
  it("should render success message text when no import results", () => {
    render(<GuideSuccessMessage />);

    expect(screen.getByText(/You're all set!/)).toBeInTheDocument();
  });

  it("should render import results with events count", () => {
    render(<GuideSuccessMessage importResults={{ eventsCount: 5 }} />);

    expect(screen.getByText("Imported 5 events")).toBeInTheDocument();
  });

  it("should render import results with singular event count", () => {
    render(<GuideSuccessMessage importResults={{ eventsCount: 1 }} />);

    expect(screen.getByText("Imported 1 event")).toBeInTheDocument();
  });

  it("should render import results with calendars count", () => {
    render(<GuideSuccessMessage importResults={{ calendarsCount: 3 }} />);

    expect(screen.getByText("Imported 3 calendars")).toBeInTheDocument();
  });

  it("should render import results with singular calendar count", () => {
    render(<GuideSuccessMessage importResults={{ calendarsCount: 1 }} />);

    expect(screen.getByText("Imported 1 calendar")).toBeInTheDocument();
  });

  it("should render import results with both events and calendars", () => {
    render(
      <GuideSuccessMessage
        importResults={{ eventsCount: 10, calendarsCount: 2 }}
      />,
    );

    expect(
      screen.getByText("Imported 10 events from 2 calendars"),
    ).toBeInTheDocument();
  });

  it("should render import results with local events synced", () => {
    render(<GuideSuccessMessage importResults={{ localEventsSynced: 4 }} />);

    expect(
      screen.getByText("4 local events synced to the cloud"),
    ).toBeInTheDocument();
  });

  it("should render import results with singular local event synced", () => {
    render(<GuideSuccessMessage importResults={{ localEventsSynced: 1 }} />);

    expect(
      screen.getByText("1 local event synced to the cloud"),
    ).toBeInTheDocument();
  });

  it("should render import results with both import and local sync messages", () => {
    const { container } = render(
      <GuideSuccessMessage
        importResults={{
          eventsCount: 10,
          calendarsCount: 2,
          localEventsSynced: 4,
        }}
      />,
    );

    expect(
      screen.getByText("Imported 10 events from 2 calendars"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("4 local events synced to the cloud"),
    ).toBeInTheDocument();
    // Verify there's a line break between the two lines
    expect(container.querySelector("br")).toBeInTheDocument();
  });

  it("should not show local sync message when count is 0", () => {
    render(
      <GuideSuccessMessage
        importResults={{ eventsCount: 5, localEventsSynced: 0 }}
      />,
    );

    expect(screen.getByText("Imported 5 events")).toBeInTheDocument();
    expect(
      screen.queryByText(/local event.*synced to the cloud/),
    ).not.toBeInTheDocument();
  });

  it("should render fallback message when import results are empty", () => {
    render(<GuideSuccessMessage importResults={{}} />);

    expect(
      screen.getByText("Your calendar has been synced successfully!"),
    ).toBeInTheDocument();
  });
});
