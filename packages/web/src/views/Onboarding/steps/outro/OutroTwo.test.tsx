import React from "react";
import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { OutroTwo } from "./OutroTwo";

// Mock the onboarding components
jest.mock("../../components", () => ({
  OnboardingCardLayout: ({ children, currentStep, totalSteps }: any) => (
    <div data-testid="onboarding-card-layout">
      <div data-testid="step-info">
        Step {currentStep} of {totalSteps}
      </div>
      {children}
    </div>
  ),
  OnboardingText: ({ children }: any) => (
    <div data-testid="onboarding-text">{children}</div>
  ),
  OnboardingButton: ({ children, onClick }: any) => (
    <button data-testid="onboarding-button" type="button" onClick={onClick}>
      {children}
    </button>
  ),
  DynamicLogo: () => <div data-testid="dynamic-logo">Dynamic Logo</div>,
}));

describe("OutroTwo", () => {
  const mockOnNext = jest.fn();
  const mockOnPrevious = jest.fn();
  const mockOnComplete = jest.fn();
  const mockOnSkip = jest.fn();

  const defaultProps = {
    currentStep: 10,
    totalSteps: 12,
    onNext: mockOnNext,
    onPrevious: mockOnPrevious,
    onComplete: mockOnComplete,
    onSkip: mockOnSkip,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Component Rendering", () => {
    it("renders the component with correct step information", () => {
      render(<OutroTwo {...defaultProps} />);

      expect(screen.getByTestId("onboarding-card-layout")).toBeInTheDocument();
      expect(screen.getByTestId("step-info")).toHaveTextContent(
        "Step 10 of 12",
      );
    });

    it("renders all expected text content", () => {
      render(<OutroTwo {...defaultProps} />);

      const textElements = screen.getAllByTestId("onboarding-text");
      expect(textElements).toHaveLength(3);

      expect(textElements[0]).toHaveTextContent(
        "I can see that you now understand that Compass helps you focus on what matters to you.",
      );
      expect(textElements[1]).toHaveTextContent(
        "Your cabin is set up, and the crew is aboard.",
      );
      expect(textElements[2]).toHaveTextContent(/It.*s finally time/);
    });

    it("renders the dynamic logo", () => {
      render(<OutroTwo {...defaultProps} />);

      expect(screen.getByTestId("dynamic-logo")).toBeInTheDocument();
    });

    it("renders the Enter button", () => {
      render(<OutroTwo {...defaultProps} />);

      const enterButton = screen.getByTestId("onboarding-button");
      expect(enterButton).toBeInTheDocument();
      expect(enterButton).toHaveTextContent("Enter");
    });
  });

  describe("Navigation Behavior", () => {
    it("calls onNext when Enter button is clicked", async () => {
      const user = userEvent.setup();
      render(<OutroTwo {...defaultProps} />);

      const enterButton = screen.getByTestId("onboarding-button");
      await user.click(enterButton);

      expect(mockOnNext).toHaveBeenCalledTimes(1);
    });

    it("does not call onPrevious when left arrow key is pressed", async () => {
      const user = userEvent.setup();
      render(<OutroTwo {...defaultProps} />);

      // Focus on the component to ensure keyboard events are captured
      const cardLayout = screen.getByTestId("onboarding-card-layout");
      cardLayout.focus();

      // Press left arrow key
      await user.keyboard("{ArrowLeft}");

      // onPrevious should not be called
      expect(mockOnPrevious).not.toHaveBeenCalled();
    });
  });

  describe("Component Props", () => {
    it("passes correct props to OnboardingCardLayout", () => {
      render(<OutroTwo {...defaultProps} />);

      const stepInfo = screen.getByTestId("step-info");
      expect(stepInfo).toHaveTextContent("Step 10 of 12");
    });

    it("handles different step numbers correctly", () => {
      const customProps = {
        ...defaultProps,
        currentStep: 5,
        totalSteps: 8,
      };

      render(<OutroTwo {...customProps} />);

      const stepInfo = screen.getByTestId("step-info");
      expect(stepInfo).toHaveTextContent("Step 5 of 8");
    });
  });

  describe("Accessibility", () => {
    it("has proper button accessibility", () => {
      render(<OutroTwo {...defaultProps} />);

      const enterButton = screen.getByTestId("onboarding-button");
      expect(enterButton).toBeInTheDocument();
      expect(enterButton).toHaveAttribute("type", "button");
    });

    it("is keyboard navigable", async () => {
      const user = userEvent.setup();
      render(<OutroTwo {...defaultProps} />);

      const enterButton = screen.getByTestId("onboarding-button");

      // Tab to the button
      await user.tab();
      expect(enterButton).toHaveFocus();

      // Press Enter on the focused button
      await user.keyboard("{Enter}");
      expect(mockOnNext).toHaveBeenCalledTimes(1);
    });
  });

  describe("Edge Cases", () => {
    it("handles rapid button clicks correctly", async () => {
      const user = userEvent.setup();
      render(<OutroTwo {...defaultProps} />);

      const enterButton = screen.getByTestId("onboarding-button");

      // Click the button multiple times rapidly
      await user.click(enterButton);
      await user.click(enterButton);
      await user.click(enterButton);

      // Each click should call onNext
      expect(mockOnNext).toHaveBeenCalledTimes(3);
    });
  });
});
