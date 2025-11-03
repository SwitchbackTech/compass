import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { MobileWarning } from "./MobileWarning";

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
  OnboardingText: ({ children, ...props }: any) => (
    <div data-testid="onboarding-text" {...props}>
      {children}
    </div>
  ),
  OnboardingButton: ({ children, onClick }: any) => (
    <button data-testid="onboarding-button" type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

describe("MobileWarning", () => {
  const mockOnNext = jest.fn();
  const mockOnPrevious = jest.fn();
  const mockOnComplete = jest.fn();
  const mockOnSkip = jest.fn();

  const defaultProps = {
    currentStep: 1,
    totalSteps: 2,
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
      render(<MobileWarning {...defaultProps} />);

      expect(screen.getByTestId("onboarding-card-layout")).toBeInTheDocument();
      expect(screen.getByTestId("step-info")).toHaveTextContent("Step 1 of 2");
    });

    it("renders the title message", () => {
      render(<MobileWarning {...defaultProps} />);

      const textElements = screen.getAllByTestId("onboarding-text");
      expect(textElements[0]).toHaveTextContent(
        "Compass isn't built for mobile yet",
      );
    });

    it("renders the descriptive message", () => {
      render(<MobileWarning {...defaultProps} />);

      const textElements = screen.getAllByTestId("onboarding-text");
      expect(textElements[1]).toHaveTextContent(
        /We're focusing on perfecting the desktop experience first/,
      );
    });

    it("renders the Continue button", () => {
      render(<MobileWarning {...defaultProps} />);

      const continueButton = screen.getByTestId("onboarding-button");
      expect(continueButton).toBeInTheDocument();
      expect(continueButton).toHaveTextContent("Continue");
    });
  });

  describe("Navigation Behavior", () => {
    it("calls onNext when Continue button is clicked", async () => {
      const user = userEvent.setup();
      render(<MobileWarning {...defaultProps} />);

      const continueButton = screen.getByTestId("onboarding-button");
      await user.click(continueButton);

      expect(mockOnNext).toHaveBeenCalledTimes(1);
    });
  });

  describe("Component Props", () => {
    it("passes correct props to OnboardingCardLayout", () => {
      render(<MobileWarning {...defaultProps} />);

      const stepInfo = screen.getByTestId("step-info");
      expect(stepInfo).toHaveTextContent("Step 1 of 2");
    });

    it("handles different step numbers correctly", () => {
      const customProps = {
        ...defaultProps,
        currentStep: 2,
        totalSteps: 3,
      };

      render(<MobileWarning {...customProps} />);

      const stepInfo = screen.getByTestId("step-info");
      expect(stepInfo).toHaveTextContent("Step 2 of 3");
    });
  });

  describe("Accessibility", () => {
    it("has proper button role and text", () => {
      render(<MobileWarning {...defaultProps} />);

      const continueButton = screen.getByRole("button");
      expect(continueButton).toBeInTheDocument();
      expect(continueButton).toHaveTextContent("Continue");
    });
  });
});
