import React from "react";
import { toast } from "react-toastify";
import "@testing-library/jest-dom";
import { fireEvent, screen, waitFor } from "@testing-library/react";
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

jest.mock("react-toastify", () => ({
  toast: {
    success: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
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
    // Clear all toast mocks
    (toast.success as jest.Mock).mockClear();
    (toast.info as jest.Mock).mockClear();
    (toast.warning as jest.Mock).mockClear();
    (toast.error as jest.Mock).mockClear();
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
      expect(continueButton).toBeDisabled(); // Disabled until valid email is entered

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

    it("enables the Continue button when valid email is entered", async () => {
      const user = userEvent.setup();
      render(<MobileWaitlistCheck {...defaultProps} />);

      const emailInput = screen.getByTestId("email-input");
      const continueButton = screen.getByText("Continue");

      expect(continueButton).toBeDisabled();

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

    it("keeps the Continue button disabled with invalid email", async () => {
      const user = userEvent.setup();
      render(<MobileWaitlistCheck {...defaultProps} />);

      const emailInput = screen.getByTestId("email-input");
      const continueButton = screen.getByText("Continue");

      // Test with invalid email formats
      await user.type(emailInput, "invalid-email");
      expect(continueButton).toBeDisabled();

      await user.clear(emailInput);
      await user.type(emailInput, "test@");
      expect(continueButton).toBeDisabled();

      await user.clear(emailInput);
      await user.type(emailInput, "@example.com");
      expect(continueButton).toBeDisabled();
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
        expect(toast.success).toHaveBeenCalledWith(
          "Welcome aboard! You're ready to set sail.",
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
        expect(toast.success).toHaveBeenCalledWith(
          "Welcome aboard! You're ready to set sail.",
        );
        expect(mockSetFirstName).toHaveBeenCalledWith("Jane");
        expect(mockOnNext).toHaveBeenCalledTimes(1);
      });
    });

    it("shows warning toast for user not on waitlist", async () => {
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
        expect(toast.warning).toHaveBeenCalledWith(
          "You're not on the crew list yet. Sign up to get notified when a spot opens up.",
        );
        expect(mockOnNext).not.toHaveBeenCalled();
        // Button should change to "Signup For Waitlist"
        expect(screen.getByText("Signup For Waitlist")).toBeInTheDocument();
      });
    });

    it("shows info toast for user on waitlist but not invited", async () => {
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
        expect(toast.info).toHaveBeenCalledWith(
          "You're on the crew list but not invited yet. We'll let you know when you're invited.",
        );
        expect(mockOnNext).not.toHaveBeenCalled();
        // Button should change to "Signup For Waitlist"
        expect(screen.getByText("Signup For Waitlist")).toBeInTheDocument();
      });
    });
  });

  describe("Button Behavior", () => {
    it("shows Continue button initially", () => {
      render(<MobileWaitlistCheck {...defaultProps} />);
      expect(screen.getByText("Continue")).toBeInTheDocument();
    });

    it("changes to Signup For Waitlist button after API call for non-invited users", async () => {
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

      await user.type(emailInput, "test@example.com");
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText("Signup For Waitlist")).toBeInTheDocument();
        expect(screen.queryByText("Continue")).not.toBeInTheDocument();
      });
    });

    it("opens waitlist signup page when Signup For Waitlist button is clicked", async () => {
      const { WaitlistApi } = require("@web/common/apis/waitlist.api");
      WaitlistApi.getWaitlistStatus.mockResolvedValue({
        isOnWaitlist: false,
        isInvited: false,
        isActive: false,
      });

      // Mock window.open
      const mockOpen = jest.fn();
      Object.defineProperty(window, "open", {
        value: mockOpen,
        writable: true,
      });

      const user = userEvent.setup();
      render(<MobileWaitlistCheck {...defaultProps} />);

      const emailInput = screen.getByTestId("email-input");
      const continueButton = screen.getByText("Continue");

      await user.type(emailInput, "test@example.com");
      await user.click(continueButton);

      await waitFor(() => {
        expect(screen.getByText("Signup For Waitlist")).toBeInTheDocument();
      });

      // Click the Signup For Waitlist button
      const signupButton = screen.getByText("Signup For Waitlist");
      await user.click(signupButton);

      expect(mockOpen).toHaveBeenCalledWith(
        "https://www.compasscalendar.com/waitlist",
        "_blank",
      );
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
        expect(toast.error).toHaveBeenCalledWith(
          "Failed to check waitlist status. Please try again.",
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
    it("provides single continue button that handles waitlist check with valid email", () => {
      render(<MobileWaitlistCheck {...defaultProps} />);

      const continueButton = screen.getByText("Continue");
      expect(continueButton).toBeInTheDocument();
      expect(continueButton).toHaveAttribute("type", "button");
      expect(continueButton).toBeDisabled(); // Disabled until valid email is entered
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

    it("requires valid email input before allowing submission", async () => {
      const user = userEvent.setup();
      render(<MobileWaitlistCheck {...defaultProps} />);

      const continueButton = screen.getByText("Continue");
      expect(continueButton).toBeDisabled();

      // Test with valid email
      const emailInput = screen.getByTestId("email-input");
      await user.type(emailInput, "test@example.com");
      expect(continueButton).not.toBeDisabled();
    });

    it("handles form submission via handleSubmit for not invited users", async () => {
      const { WaitlistApi } = require("@web/common/apis/waitlist.api");
      WaitlistApi.getWaitlistStatus.mockResolvedValue({
        isOnWaitlist: false,
        isInvited: false,
        isActive: false,
      });

      const user = userEvent.setup();
      render(<MobileWaitlistCheck {...defaultProps} />);

      const emailInput = screen.getByTestId("email-input");
      const form = screen.getByTestId("onboarding-form");

      await user.type(emailInput, "newuser@example.com");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(WaitlistApi.getWaitlistStatus).toHaveBeenCalledWith(
          "newuser@example.com",
        );
        expect(toast.warning).toHaveBeenCalledWith(
          "You're not on the crew list yet. Sign up to get notified when a spot opens up.",
        );
        expect(mockOnNext).not.toHaveBeenCalled();
      });
    });

    it("handles form submission via handleSubmit for waitlist users not yet invited", async () => {
      const { WaitlistApi } = require("@web/common/apis/waitlist.api");
      WaitlistApi.getWaitlistStatus.mockResolvedValue({
        isOnWaitlist: true,
        isInvited: false,
        isActive: false,
      });

      const user = userEvent.setup();
      render(<MobileWaitlistCheck {...defaultProps} />);

      const emailInput = screen.getByTestId("email-input");
      const form = screen.getByTestId("onboarding-form");

      await user.type(emailInput, "waitlist@example.com");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(WaitlistApi.getWaitlistStatus).toHaveBeenCalledWith(
          "waitlist@example.com",
        );
        expect(toast.info).toHaveBeenCalledWith(
          "You're on the crew list but not invited yet. We'll let you know when you're invited.",
        );
        expect(mockOnNext).not.toHaveBeenCalled();
      });
    });

    it("handles form submission via handleSubmit for invited users", async () => {
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
      const form = screen.getByTestId("onboarding-form");

      await user.type(emailInput, "john@example.com");
      fireEvent.submit(form);

      await waitFor(() => {
        expect(WaitlistApi.getWaitlistStatus).toHaveBeenCalledWith(
          "john@example.com",
        );
        expect(toast.success).toHaveBeenCalledWith(
          "Welcome aboard! You're ready to set sail.",
        );
        expect(mockSetFirstName).toHaveBeenCalledWith("John");
        expect(mockOnNext).toHaveBeenCalledTimes(1);
      });
    });
  });
});
