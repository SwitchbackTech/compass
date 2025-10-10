import React from "react";
import "@testing-library/jest-dom";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { MobileWaitlistCheck } from "./MobileWaitlistCheck";

// Mock dependencies
const mockSetFirstName = jest.fn();

jest.mock("@web/common/apis/waitlist.api", () => ({
  WaitlistApi: {
    getWaitlistStatus: jest.fn(),
  },
}));

jest.mock("../../components/OnboardingContext", () => ({
  useOnboarding: () => ({
    setFirstName: mockSetFirstName,
  }),
}));

// Mock the onboarding components
jest.mock("../../components", () => ({
  OnboardingButton: ({ children, onClick, disabled, type, ...props }: any) => (
    <button
      data-testid={props["data-testid"] || "onboarding-button"}
      onClick={onClick}
      disabled={disabled}
      type={type}
      {...props}
    >
      {children}
    </button>
  ),
  OnboardingCardLayout: ({ children, currentStep, totalSteps }: any) => (
    <div data-testid="onboarding-card-layout">
      <div data-testid="step-indicator">
        Step {currentStep} of {totalSteps}
      </div>
      {children}
    </div>
  ),
  OnboardingInput: ({
    id,
    type,
    placeholder,
    value,
    onChange,
    autoFocus,
  }: any) => (
    <input
      data-testid="email-input"
      id={id}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      autoFocus={autoFocus}
    />
  ),
  OnboardingInputLabel: ({ htmlFor, children }: any) => (
    <label data-testid="email-label" htmlFor={htmlFor}>
      {children}
    </label>
  ),
  OnboardingInputSection: ({ children }: any) => (
    <div data-testid="input-section">{children}</div>
  ),
  OnboardingLink: ({ href, target, rel, children }: any) => (
    <a data-testid="waitlist-link" href={href} target={target} rel={rel}>
      {children}
    </a>
  ),
  OnboardingText: ({ children, ...props }: any) => (
    <div data-testid="onboarding-text" {...props}>
      {children}
    </div>
  ),
}));

jest.mock("../../components/OnboardingForm", () => ({
  OnboardingForm: ({ children, onSubmit }: any) => (
    <form data-testid="onboarding-form" onSubmit={onSubmit}>
      {children}
    </form>
  ),
}));

describe("MobileWaitlistCheck - User Experience", () => {
  const mockOnNext = jest.fn();
  const mockOnPrevious = jest.fn();
  const mockOnComplete = jest.fn();
  const mockOnSkip = jest.fn();

  const defaultProps = {
    currentStep: 1,
    totalSteps: 3,
    onNext: mockOnNext,
    onPrevious: mockOnPrevious,
    onComplete: mockOnComplete,
    onSkip: mockOnSkip,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Initial User Experience", () => {
    it("shows the user a clear step indicator", () => {
      render(<MobileWaitlistCheck {...defaultProps} />);

      expect(screen.getByTestId("step-indicator")).toHaveTextContent(
        "Step 1 of 3",
      );
    });

    it("shows email input and single continue button initially", () => {
      render(<MobileWaitlistCheck {...defaultProps} />);

      const continueButton = screen.getByText("Continue");

      expect(continueButton).toBeInTheDocument();
      expect(continueButton).not.toBeDisabled(); // Always enabled now

      // Email input should be visible
      expect(screen.getByTestId("email-input")).toBeInTheDocument();
      expect(screen.getByTestId("onboarding-form")).toBeInTheDocument();

      // Should not have bypass button
      expect(screen.queryByText("BYPASS WAITLIST")).not.toBeInTheDocument();
    });

    it("displays the gangway message", () => {
      render(<MobileWaitlistCheck {...defaultProps} />);

      expect(
        screen.getByText("The gangway lowers only for the chosen."),
      ).toBeInTheDocument();
    });
  });

  describe("User Interaction Flow", () => {
    it("allows the user to enter an email address", async () => {
      const user = userEvent.setup();
      render(<MobileWaitlistCheck {...defaultProps} />);

      const emailInput = screen.getByTestId("email-input");
      await user.type(emailInput, "test@example.com");

      expect(emailInput).toHaveValue("test@example.com");
    });

    it("keeps the Continue button enabled at all times", async () => {
      const user = userEvent.setup();
      render(<MobileWaitlistCheck {...defaultProps} />);

      const emailInput = screen.getByTestId("email-input");
      const continueButton = screen.getByText("Continue");

      expect(continueButton).not.toBeDisabled();

      await user.type(emailInput, "test@example.com");

      expect(continueButton).not.toBeDisabled();
    });

    it("allows the user to continue after entering email", async () => {
      const { WaitlistApi } = require("@web/common/apis/waitlist.api");
      WaitlistApi.getWaitlistStatus.mockResolvedValue({
        isOnWaitlist: true,
        isInvited: true,
        isActive: false,
        firstName: "Test",
      });

      const user = userEvent.setup();
      render(<MobileWaitlistCheck {...defaultProps} />);

      const emailInput = screen.getByTestId("email-input");
      const continueButton = screen.getByText("Continue");

      await user.type(emailInput, "test@example.com");
      await user.click(continueButton);

      await waitFor(() => {
        expect(mockOnNext).toHaveBeenCalledTimes(1);
      });
    });

    it("allows the user to bypass the waitlist by clicking continue without email", async () => {
      const user = userEvent.setup();
      render(<MobileWaitlistCheck {...defaultProps} />);

      const continueButton = screen.getByText("Continue");
      await user.click(continueButton);

      expect(mockSetFirstName).toHaveBeenCalledWith("Sailor");
      expect(mockOnNext).toHaveBeenCalledTimes(1);
    });
  });

  describe("Waitlist Status Validation", () => {
    it("handles successful waitlist check for invited user", async () => {
      const { WaitlistApi } = require("@web/common/apis/waitlist.api");
      WaitlistApi.getWaitlistStatus.mockResolvedValue({
        isOnWaitlist: true,
        isInvited: true,
        isActive: false,
        firstName: "John",
      });

      const user = userEvent.setup();
      render(<MobileWaitlistCheck {...defaultProps} />);

      const emailInput = screen.getByTestId("email-input");
      const continueButton = screen.getByText("Continue");

      await user.type(emailInput, "john@example.com");
      await user.click(continueButton);

      await waitFor(() => {
        expect(WaitlistApi.getWaitlistStatus).toHaveBeenCalledWith(
          "john@example.com",
        );
        expect(mockSetFirstName).toHaveBeenCalledWith("John");
        expect(mockOnNext).toHaveBeenCalledTimes(1);
      });
    });

    it("handles waitlist check for active user", async () => {
      const { WaitlistApi } = require("@web/common/apis/waitlist.api");
      WaitlistApi.getWaitlistStatus.mockResolvedValue({
        isOnWaitlist: true,
        isInvited: false,
        isActive: true,
        firstName: "Jane",
      });

      const user = userEvent.setup();
      render(<MobileWaitlistCheck {...defaultProps} />);

      const emailInput = screen.getByTestId("email-input");
      const continueButton = screen.getByText("Continue");

      await user.type(emailInput, "jane@example.com");
      await user.click(continueButton);

      await waitFor(() => {
        expect(WaitlistApi.getWaitlistStatus).toHaveBeenCalledWith(
          "jane@example.com",
        );
        expect(mockSetFirstName).toHaveBeenCalledWith("Jane");
        expect(mockOnNext).toHaveBeenCalledTimes(1);
      });
    });

    it("shows not invited message for user not on waitlist", async () => {
      const { WaitlistApi } = require("@web/common/apis/waitlist.api");
      WaitlistApi.getWaitlistStatus.mockResolvedValue({
        isOnWaitlist: false,
        isInvited: false,
        isActive: false,
      });

      const user = userEvent.setup();
      render(<MobileWaitlistCheck {...defaultProps} />);

      const emailInput = screen.getByTestId("email-input");
      const continueButton = screen.getByText("Continue");

      await user.type(emailInput, "newuser@example.com");
      await user.click(continueButton);

      await waitFor(() => {
        expect(
          screen.getByText("You're not on the crew list yet."),
        ).toBeInTheDocument();
        expect(
          screen.getByText("Sign up to get notified when a spot opens up."),
        ).toBeInTheDocument();
        expect(screen.getByTestId("waitlist-link")).toHaveAttribute(
          "href",
          "https://www.compasscalendar.com/waitlist",
        );
      });
    });

    it("shows waitlist message for user on waitlist but not invited", async () => {
      const { WaitlistApi } = require("@web/common/apis/waitlist.api");
      WaitlistApi.getWaitlistStatus.mockResolvedValue({
        isOnWaitlist: true,
        isInvited: false,
        isActive: false,
      });

      const user = userEvent.setup();
      render(<MobileWaitlistCheck {...defaultProps} />);

      const emailInput = screen.getByTestId("email-input");
      const continueButton = screen.getByText("Continue");

      await user.type(emailInput, "waitlist@example.com");
      await user.click(continueButton);

      await waitFor(() => {
        expect(
          screen.getByText("You're on the crew list but not invited yet."),
        ).toBeInTheDocument();
        expect(
          screen.getByText("We'll let you know when you're invited."),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("handles waitlist API errors gracefully", async () => {
      const { WaitlistApi } = require("@web/common/apis/waitlist.api");
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      WaitlistApi.getWaitlistStatus.mockRejectedValue(new Error("API Error"));

      const user = userEvent.setup();
      render(<MobileWaitlistCheck {...defaultProps} />);

      const emailInput = screen.getByTestId("email-input");
      const continueButton = screen.getByText("Continue");

      await user.type(emailInput, "error@example.com");
      await user.click(continueButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          "Error checking waitlist status:",
          expect.any(Error),
        );
      });

      // Form should still be functional after error
      expect(screen.getByTestId("onboarding-form")).toBeInTheDocument();
      expect(screen.getByText("Continue")).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it("disables buttons during loading state", async () => {
      const { WaitlistApi } = require("@web/common/apis/waitlist.api");
      WaitlistApi.getWaitlistStatus.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      const user = userEvent.setup();
      render(<MobileWaitlistCheck {...defaultProps} />);

      const emailInput = screen.getByTestId("email-input");
      const continueButton = screen.getByText("Continue");

      await user.type(emailInput, "test@example.com");
      await user.click(continueButton);

      expect(continueButton).toBeDisabled();
    });
  });

  describe("Mobile-Specific Features", () => {
    it("provides single continue button that handles both waitlist check and bypass", () => {
      render(<MobileWaitlistCheck {...defaultProps} />);

      const continueButton = screen.getByText("Continue");
      expect(continueButton).toBeInTheDocument();
      expect(continueButton).toHaveAttribute("type", "button");
      expect(continueButton).not.toBeDisabled();
    });

    it("maintains proper step progression for mobile flow", () => {
      const customProps = {
        ...defaultProps,
        currentStep: 1,
        totalSteps: 3,
      };

      render(<MobileWaitlistCheck {...customProps} />);

      expect(screen.getByTestId("step-indicator")).toHaveTextContent(
        "Step 1 of 3",
      );
    });

    it("handles different step configurations correctly", () => {
      const configurations = [
        { currentStep: 1, totalSteps: 2 },
        { currentStep: 2, totalSteps: 4 },
        { currentStep: 1, totalSteps: 5 },
      ];

      configurations.forEach((config) => {
        const { unmount } = render(
          <MobileWaitlistCheck {...defaultProps} {...config} />,
        );
        expect(screen.getByTestId("step-indicator")).toHaveTextContent(
          `Step ${config.currentStep} of ${config.totalSteps}`,
        );
        unmount();
      });
    });
  });

  describe("Form Validation", () => {
    it("trims and lowercases email input", async () => {
      const { WaitlistApi } = require("@web/common/apis/waitlist.api");
      WaitlistApi.getWaitlistStatus.mockResolvedValue({
        isOnWaitlist: true,
        isInvited: true,
        isActive: false,
        firstName: "Test",
      });

      const user = userEvent.setup();
      render(<MobileWaitlistCheck {...defaultProps} />);

      const emailInput = screen.getByTestId("email-input");
      const continueButton = screen.getByText("Continue");

      await user.type(emailInput, "  TEST@EXAMPLE.COM  ");
      await user.click(continueButton);

      await waitFor(() => {
        expect(WaitlistApi.getWaitlistStatus).toHaveBeenCalledWith(
          "test@example.com",
        );
      });
    });

    it("allows submission with or without email input", async () => {
      const user = userEvent.setup();
      render(<MobileWaitlistCheck {...defaultProps} />);

      const continueButton = screen.getByText("Continue");
      expect(continueButton).not.toBeDisabled();
    });
  });
});
