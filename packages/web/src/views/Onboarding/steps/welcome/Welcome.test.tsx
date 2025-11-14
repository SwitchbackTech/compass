import { act } from "react";
import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { WelcomeStep } from "./Welcome";

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
  OnboardingText: ({ children, visible, ...props }: any) => (
    <div
      data-testid="onboarding-text"
      data-visible={visible}
      style={{ opacity: visible !== false ? 1 : 0 }}
      {...props}
    >
      {children}
    </div>
  ),
}));

describe("WelcomeStep", () => {
  const mockOnNext = jest.fn();
  const mockOnPrevious = jest.fn();
  const mockOnSkip = jest.fn();

  const defaultProps = {
    currentStep: 1,
    totalSteps: 5,
    onNext: mockOnNext,
    onPrevious: mockOnPrevious,
    onSkip: mockOnSkip,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  describe("Component Rendering", () => {
    it("renders the component with correct step information", () => {
      render(<WelcomeStep {...defaultProps} />);

      expect(screen.getByTestId("onboarding-card-layout")).toBeInTheDocument();
      expect(screen.getByTestId("step-info")).toHaveTextContent("Step 1 of 5");
    });

    it("renders initial text lines", () => {
      render(<WelcomeStep {...defaultProps} />);

      expect(screen.getByText("COMPASS CALENDAR")).toBeInTheDocument();
      expect(
        screen.getByText("The weekly planner for minimalists"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Copyright (c) 2025. All Rights Reserved"),
      ).toBeInTheDocument();
      expect(screen.getByText("BIOS Version: 20250721")).toBeInTheDocument();
      expect(screen.getByText("2514 KB")).toBeInTheDocument();
    });

    it("renders date and time", () => {
      render(<WelcomeStep {...defaultProps} />);

      // Date and time are rendered, exact format depends on locale
      const textElements = screen.getAllByTestId("onboarding-text");
      const hasDateOrTime = textElements.some((el) => {
        const text = el.textContent || "";
        return text.includes("2025") || /\d{1,2}:\d{2}/.test(text);
      });
      expect(hasDateOrTime).toBe(true);
    });
  });

  describe("Animation Behavior", () => {
    it("shows lines progressively over time", async () => {
      render(<WelcomeStep {...defaultProps} />);

      // After initial delay (200ms), first line should appear
      act(() => {
        jest.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(screen.getByText("COMPASS CALENDAR")).toBeInTheDocument();
      });

      // After another 800ms, second line should appear
      act(() => {
        jest.advanceTimersByTime(800);
      });

      await waitFor(() => {
        expect(
          screen.getByText("The weekly planner for minimalists"),
        ).toBeInTheDocument();
      });
    });

    it("shows check results after check text appears", async () => {
      render(<WelcomeStep {...defaultProps} />);

      // Fast-forward to first check line (7 text lines * 800ms + 200ms initial delay)
      act(() => {
        jest.advanceTimersByTime(5800);
      });

      await waitFor(() => {
        expect(screen.getByText(/Night Vision Check/)).toBeInTheDocument();
      });

      // After 150ms delay, result should appear
      act(() => {
        jest.advanceTimersByTime(150);
      });

      await waitFor(() => {
        expect(screen.getByText("98% Lanterns Lit")).toBeInTheDocument();
      });
    });

    it("completes animation after all lines are shown", async () => {
      render(<WelcomeStep {...defaultProps} />);

      // Fast-forward through entire animation
      // Text lines: 7 * 800ms = 5600ms + 200ms initial = 5800ms
      // Check lines: 10 * 400ms = 4000ms
      // Final line: 300ms
      // Total: ~10100ms
      act(() => {
        jest.advanceTimersByTime(11000);
      });

      await waitFor(() => {
        expect(screen.getByText("Press Any Key to board")).toBeInTheDocument();
      });
    });
  });

  describe("Click Interaction", () => {
    it("skips animation when clicking container during animation", async () => {
      const user = userEvent.setup({ delay: null });
      render(<WelcomeStep {...defaultProps} />);

      // Start animation
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Click on any text element (they're all inside the clickable container)
      const textElement = screen.getByText("COMPASS CALENDAR");

      await act(async () => {
        await user.click(textElement);
      });

      // All lines should be visible immediately
      await waitFor(() => {
        expect(screen.getByText("COMPASS CALENDAR")).toBeInTheDocument();
        expect(screen.getByText("Press Any Key to board")).toBeInTheDocument();
        expect(screen.getByText("98% Lanterns Lit")).toBeInTheDocument();
      });
    });

    it("calls onNext when clicking container after animation completes", async () => {
      const user = userEvent.setup({ delay: null });
      render(<WelcomeStep {...defaultProps} />);

      // Complete animation
      act(() => {
        jest.advanceTimersByTime(11000);
      });

      await waitFor(() => {
        expect(screen.getByText("Press Any Key to board")).toBeInTheDocument();
      });

      // Click on any text element (they're all inside the clickable container)
      const textElement = screen.getByText("Press Any Key to board");

      await act(async () => {
        await user.click(textElement);
      });

      expect(mockOnNext).toHaveBeenCalledTimes(1);
    });
  });

  describe("Keyboard Interaction", () => {
    it("skips animation when pressing Enter during animation", async () => {
      const user = userEvent.setup({ delay: null });
      render(<WelcomeStep {...defaultProps} />);

      // Start animation
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Press Enter
      await act(async () => {
        await user.keyboard("{Enter}");
      });

      // All content should be visible
      await waitFor(() => {
        expect(screen.getByText("COMPASS CALENDAR")).toBeInTheDocument();
        expect(screen.getByText("Press Any Key to board")).toBeInTheDocument();
      });
    });

    it("skips animation when pressing ArrowRight during animation", async () => {
      const user = userEvent.setup({ delay: null });
      render(<WelcomeStep {...defaultProps} />);

      // Start animation
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Press ArrowRight
      await act(async () => {
        await user.keyboard("{ArrowRight}");
      });

      // All content should be visible
      await waitFor(() => {
        expect(screen.getByText("COMPASS CALENDAR")).toBeInTheDocument();
        expect(screen.getByText("Press Any Key to board")).toBeInTheDocument();
      });
    });

    it("calls onNext when pressing Enter after animation completes", async () => {
      const user = userEvent.setup({ delay: null });
      render(<WelcomeStep {...defaultProps} />);

      // Complete animation
      act(() => {
        jest.advanceTimersByTime(11000);
      });

      await waitFor(() => {
        expect(screen.getByText("Press Any Key to board")).toBeInTheDocument();
      });

      // Press Enter
      await act(async () => {
        await user.keyboard("{Enter}");
      });

      expect(mockOnNext).toHaveBeenCalledTimes(1);
    });

    it("calls onNext when pressing any key after animation completes", async () => {
      const user = userEvent.setup({ delay: null });
      render(<WelcomeStep {...defaultProps} />);

      // Complete animation
      act(() => {
        jest.advanceTimersByTime(11000);
      });

      await waitFor(() => {
        expect(screen.getByText("Press Any Key to board")).toBeInTheDocument();
      });

      // Press any key (e.g., Space)
      await act(async () => {
        await user.keyboard(" ");
      });

      expect(mockOnNext).toHaveBeenCalledTimes(1);
    });
  });

  describe("Check Lines Display", () => {
    it("displays all check lines with their results when animation is skipped", async () => {
      const user = userEvent.setup({ delay: null });
      render(<WelcomeStep {...defaultProps} />);

      // Skip animation to see all checks immediately
      const textElement = screen.getByText("COMPASS CALENDAR");

      await act(async () => {
        await user.click(textElement);
      });

      await waitFor(() => {
        expect(screen.getByText(/Night Vision Check/)).toBeInTheDocument();
        expect(screen.getByText("98% Lanterns Lit")).toBeInTheDocument();
        expect(
          screen.getByText(/Staff Emergency Contacts/),
        ).toBeInTheDocument();
        expect(screen.getByText("Secured in Cabin")).toBeInTheDocument();
        expect(
          screen.getByText(/Initializing Compass Alignment/),
        ).toBeInTheDocument();
        expect(screen.getByText("Done")).toBeInTheDocument();
        expect(screen.getByText(/Final Anchor Check/)).toBeInTheDocument();
        expect(screen.getByText("Ready to Hoist")).toBeInTheDocument();
        expect(screen.getByText(/Sails Unfurled/)).toBeInTheDocument();
        expect(screen.getByText("Awaiting Orders")).toBeInTheDocument();
      });
    });
  });

  describe("Props Handling", () => {
    it("passes correct props to OnboardingCardLayout", () => {
      render(<WelcomeStep {...defaultProps} />);

      const stepInfo = screen.getByTestId("step-info");
      expect(stepInfo).toHaveTextContent("Step 1 of 5");
    });

    it("handles different step numbers correctly", () => {
      const customProps = {
        ...defaultProps,
        currentStep: 2,
        totalSteps: 10,
      };

      render(<WelcomeStep {...customProps} />);

      const stepInfo = screen.getByTestId("step-info");
      expect(stepInfo).toHaveTextContent("Step 2 of 10");
    });
  });

  describe("Animation Skip Logic", () => {
    it("shows all check results immediately when skipped", async () => {
      const user = userEvent.setup({ delay: null });
      render(<WelcomeStep {...defaultProps} />);

      const textElement = screen.getByText("COMPASS CALENDAR");

      await act(async () => {
        await user.click(textElement);
      });

      // All check results should be visible immediately
      await waitFor(() => {
        const checkResults = [
          "98% Lanterns Lit",
          "Secured in Cabin",
          "Done",
          "Sufficient",
          "All Lines Taut",
          "Complete",
          "One Missing",
          "Favorable",
          "Ready to Hoist",
          "Awaiting Orders",
        ];

        checkResults.forEach((result) => {
          expect(screen.getByText(result)).toBeInTheDocument();
        });
      });
    });
  });
});
