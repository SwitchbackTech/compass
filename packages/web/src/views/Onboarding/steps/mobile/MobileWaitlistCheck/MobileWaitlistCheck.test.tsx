import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { WaitlistApi } from "@web/common/apis/waitlist.api";
import { WAITLIST_URL } from "@web/common/constants/web.constants";
import { MobileWaitlistCheck } from "./MobileWaitlistCheck";

// Mock dependencies
const mockSetFirstName = jest.fn();

jest.mock("@web/common/apis/waitlist.api", () => ({
  WaitlistApi: {
    getWaitlistStatus: jest.fn(),
  },
}));

jest.mock("../../../components/OnboardingContext", () => ({
  useOnboarding: () => ({
    setFirstName: mockSetFirstName,
  }),
}));

// Mock the onboarding components
jest.mock("../../../components", () => ({
  OnboardingButton: ({ children, onClick, disabled, type, ...props }) => (
    <button
      data-testid={props["data-testid"] || "onboarding-button"}
      onClick={onClick}
      disabled={disabled}
      type={type}
    >
      {children}
    </button>
  ),
  OnboardingCardLayout: ({ children, currentStep, totalSteps }) => (
    <div data-testid="onboarding-card-layout">
      <div data-testid="step-indicator">
        Step {currentStep} of {totalSteps}
      </div>
      {children}
    </div>
  ),
  OnboardingInput: ({ id, type, placeholder, value, onChange, autoFocus }) => (
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
  OnboardingInputLabel: ({ htmlFor, children }) => (
    <label data-testid="email-label" htmlFor={htmlFor}>
      {children}
    </label>
  ),
  OnboardingInputSection: ({ children }) => (
    <div data-testid="input-section">{children}</div>
  ),
  OnboardingLink: ({ href, target, rel, children }) => (
    <a data-testid="waitlist-link" href={href} target={target} rel={rel}>
      {children}
    </a>
  ),
  OnboardingText: ({ children, ...props }) => (
    <div data-testid="onboarding-text" {...props}>
      {children}
    </div>
  ),
}));

jest.mock("../../../components/OnboardingForm", () => ({
  OnboardingForm: ({ children, onSubmit }) => (
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

    it("shows email input and bypass waitlist button initially", () => {
      render(<MobileWaitlistCheck {...defaultProps} />);

      const bypassButton = screen.getByText("BYPASS WAITLIST");

      expect(bypassButton).toBeInTheDocument();

      // Email input should be visible
      expect(screen.getByTestId("email-input")).toBeInTheDocument();
      expect(screen.getByTestId("onboarding-form")).toBeInTheDocument();
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

    it("shows BYPASS WAITLIST button when email is entered", async () => {
      const user = userEvent.setup();
      render(<MobileWaitlistCheck {...defaultProps} />);

      const emailInput = screen.getByTestId("email-input");
      const bypassButton = screen.getByText("BYPASS WAITLIST");

      expect(bypassButton).toBeInTheDocument();

      await user.type(emailInput, "test@example.com");

      expect(bypassButton).toBeInTheDocument();
    });

    it("allows the user to bypass waitlist after entering email", async () => {
      WaitlistApi.getWaitlistStatus.mockResolvedValue({
        isOnWaitlist: true,
        isInvited: true,
        isActive: false,
        firstName: "Test",
      });

      const user = userEvent.setup();
      render(<MobileWaitlistCheck {...defaultProps} />);

      const emailInput = screen.getByTestId("email-input");
      const bypassButton = screen.getByText("BYPASS WAITLIST");

      await user.type(emailInput, "test@example.com");
      await user.click(bypassButton);

      await waitFor(() => {
        expect(mockOnNext).toHaveBeenCalledTimes(1);
      });
    });

    it("shows BYPASS WAITLIST button with invalid email", async () => {
      const user = userEvent.setup();
      render(<MobileWaitlistCheck {...defaultProps} />);

      const emailInput = screen.getByTestId("email-input");

      // Test with invalid email formats
      await user.type(emailInput, "invalid-email");
      expect(screen.getByText("BYPASS WAITLIST")).toBeInTheDocument();

      await user.clear(emailInput);
      await user.type(emailInput, "test@");
      expect(screen.getByText("BYPASS WAITLIST")).toBeInTheDocument();

      await user.clear(emailInput);
      await user.type(emailInput, "@example.com");
      expect(screen.getByText("BYPASS WAITLIST")).toBeInTheDocument();
    });
  });

  describe("Waitlist Status Validation", () => {
    it("handles successful waitlist check for invited user", async () => {
      WaitlistApi.getWaitlistStatus.mockResolvedValue({
        isOnWaitlist: true,
        isInvited: true,
        isActive: false,
        firstName: "John",
      });

      const user = userEvent.setup();
      render(<MobileWaitlistCheck {...defaultProps} />);

      const emailInput = screen.getByTestId("email-input");
      const bypassButton = screen.getByText("BYPASS WAITLIST");

      await user.type(emailInput, "john@example.com");
      await user.click(bypassButton);

      await waitFor(() => {
        expect(WaitlistApi.getWaitlistStatus).toHaveBeenCalledWith(
          "john@example.com",
        );
        expect(
          screen.getByText("Welcome aboard! You're ready to set sail."),
        ).toBeInTheDocument();
        expect(mockSetFirstName).toHaveBeenCalledWith("John");
        expect(mockOnNext).toHaveBeenCalledTimes(1);
      });
    });

    it("handles waitlist check for active user", async () => {
      WaitlistApi.getWaitlistStatus.mockResolvedValue({
        isOnWaitlist: true,
        isInvited: false,
        isActive: true,
        firstName: "Jane",
      });

      const user = userEvent.setup();
      render(<MobileWaitlistCheck {...defaultProps} />);

      const emailInput = screen.getByTestId("email-input");
      const bypassButton = screen.getByText("BYPASS WAITLIST");

      await user.type(emailInput, "jane@example.com");
      await user.click(bypassButton);

      await waitFor(() => {
        expect(WaitlistApi.getWaitlistStatus).toHaveBeenCalledWith(
          "jane@example.com",
        );
        expect(
          screen.getByText("Welcome aboard! You're ready to set sail."),
        ).toBeInTheDocument();
        expect(mockSetFirstName).toHaveBeenCalledWith("Jane");
        expect(mockOnNext).toHaveBeenCalledTimes(1);
      });
    });

    it("shows warning message for user not on waitlist", async () => {
      WaitlistApi.getWaitlistStatus.mockResolvedValue({
        isOnWaitlist: false,
        isInvited: false,
        isActive: false,
      });

      const user = userEvent.setup();
      render(<MobileWaitlistCheck {...defaultProps} />);

      const emailInput = screen.getByTestId("email-input");
      const bypassButton = screen.getByText("BYPASS WAITLIST");

      await user.type(emailInput, "newuser@example.com");
      await user.click(bypassButton);

      await waitFor(() => {
        expect(
          screen.getByText(
            "You're not on the crew list yet. Sign up to get notified when a spot opens up.",
          ),
        ).toBeInTheDocument();
        expect(mockOnNext).not.toHaveBeenCalled();
        // Button should change to "Signup For Waitlist"
        expect(screen.getByText("Signup For Waitlist")).toBeInTheDocument();
      });
    });

    it("shows info message for user on waitlist but not invited", async () => {
      WaitlistApi.getWaitlistStatus.mockResolvedValue({
        isOnWaitlist: true,
        isInvited: false,
        isActive: false,
      });

      const user = userEvent.setup();
      render(<MobileWaitlistCheck {...defaultProps} />);

      const emailInput = screen.getByTestId("email-input");
      const bypassButton = screen.getByText("BYPASS WAITLIST");

      await user.type(emailInput, "waitlist@example.com");
      await user.click(bypassButton);

      await waitFor(() => {
        expect(
          screen.getByText(
            "You're on the crew list but not invited yet. We'll let you know when you're invited.",
          ),
        ).toBeInTheDocument();
        expect(mockOnNext).not.toHaveBeenCalled();
        // Button should change to "Signup For Waitlist"
        expect(screen.getByText("Signup For Waitlist")).toBeInTheDocument();
      });
    });
  });

  describe("Button Behavior", () => {
    it("shows BYPASS WAITLIST button initially", () => {
      render(<MobileWaitlistCheck {...defaultProps} />);
      expect(screen.getByText("BYPASS WAITLIST")).toBeInTheDocument();
    });

    it("changes to Signup For Waitlist button after API call for non-invited users", async () => {
      WaitlistApi.getWaitlistStatus.mockResolvedValue({
        isOnWaitlist: false,
        isInvited: false,
        isActive: false,
      });

      const user = userEvent.setup();
      render(<MobileWaitlistCheck {...defaultProps} />);

      const emailInput = screen.getByTestId("email-input");
      const bypassButton = screen.getByText("BYPASS WAITLIST");

      await user.type(emailInput, "test@example.com");
      await user.click(bypassButton);

      await waitFor(() => {
        expect(screen.getByText("Signup For Waitlist")).toBeInTheDocument();
        expect(screen.queryByText("BYPASS WAITLIST")).not.toBeInTheDocument();
      });
    });

    it("opens waitlist signup page when Signup For Waitlist button is clicked", async () => {
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
      const bypassButton = screen.getByText("BYPASS WAITLIST");

      await user.type(emailInput, "test@example.com");
      await user.click(bypassButton);

      await waitFor(() => {
        expect(screen.getByText("Signup For Waitlist")).toBeInTheDocument();
      });

      // Click the Signup For Waitlist button
      const signupButton = screen.getByText("Signup For Waitlist");
      await user.click(signupButton);

      expect(mockOpen).toHaveBeenCalledWith(WAITLIST_URL, "_blank");
    });
  });

  describe("Error Handling", () => {
    it("handles waitlist API errors gracefully", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      WaitlistApi.getWaitlistStatus.mockRejectedValue(new Error("API Error"));

      const user = userEvent.setup();
      render(<MobileWaitlistCheck {...defaultProps} />);

      const emailInput = screen.getByTestId("email-input");
      const bypassButton = screen.getByText("BYPASS WAITLIST");

      await user.type(emailInput, "error@example.com");
      await user.click(bypassButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          "Error checking waitlist status:",
          expect.any(Error),
        );
        expect(
          screen.getByText(
            "Failed to check waitlist status. Please try again.",
          ),
        ).toBeInTheDocument();
      });

      // Form should still be functional after error
      expect(screen.getByTestId("onboarding-form")).toBeInTheDocument();
      // After error, button shows BYPASS WAITLIST for retry
      expect(screen.getByText("BYPASS WAITLIST")).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it("shows checking state during loading", async () => {
      WaitlistApi.getWaitlistStatus.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      const user = userEvent.setup();
      render(<MobileWaitlistCheck {...defaultProps} />);

      const emailInput = screen.getByTestId("email-input");
      const bypassButton = screen.getByText("BYPASS WAITLIST");

      await user.type(emailInput, "test@example.com");
      await user.click(bypassButton);

      expect(screen.getByText("Checking...")).toBeInTheDocument();
    });
  });

  describe("Mobile-Specific Features", () => {
    it("provides bypass waitlist button that handles waitlist check", () => {
      render(<MobileWaitlistCheck {...defaultProps} />);

      const bypassButton = screen.getByText("BYPASS WAITLIST");
      expect(bypassButton).toBeInTheDocument();
      expect(bypassButton).toHaveAttribute("type", "button");
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
      WaitlistApi.getWaitlistStatus.mockResolvedValue({
        isOnWaitlist: true,
        isInvited: true,
        isActive: false,
        firstName: "Test",
      });

      const user = userEvent.setup();
      render(<MobileWaitlistCheck {...defaultProps} />);

      const emailInput = screen.getByTestId("email-input");
      const bypassButton = screen.getByText("BYPASS WAITLIST");

      await user.type(emailInput, "  TEST@EXAMPLE.COM  ");
      await user.click(bypassButton);

      await waitFor(() => {
        expect(WaitlistApi.getWaitlistStatus).toHaveBeenCalledWith(
          "test@example.com",
        );
      });
    });

    it("shows BYPASS WAITLIST button regardless of email validity", async () => {
      const user = userEvent.setup();
      render(<MobileWaitlistCheck {...defaultProps} />);

      expect(screen.getByText("BYPASS WAITLIST")).toBeInTheDocument();

      // Test with valid email
      const emailInput = screen.getByTestId("email-input");
      await user.type(emailInput, "test@example.com");
      expect(screen.getByText("BYPASS WAITLIST")).toBeInTheDocument();
    });

    it("handles form submission via handleSubmit for not invited users", async () => {
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
        expect(
          screen.getByText(
            "You're not on the crew list yet. Sign up to get notified when a spot opens up.",
          ),
        ).toBeInTheDocument();
        expect(mockOnNext).not.toHaveBeenCalled();
      });
    });

    it("handles form submission via handleSubmit for waitlist users not yet invited", async () => {
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
        expect(
          screen.getByText(
            "You're on the crew list but not invited yet. We'll let you know when you're invited.",
          ),
        ).toBeInTheDocument();
        expect(mockOnNext).not.toHaveBeenCalled();
      });
    });

    it("handles form submission via handleSubmit for invited users", async () => {
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
        expect(
          screen.getByText("Welcome aboard! You're ready to set sail."),
        ).toBeInTheDocument();
        expect(mockSetFirstName).toHaveBeenCalledWith("John");
        expect(mockOnNext).toHaveBeenCalledTimes(1);
      });
    });
  });
});
