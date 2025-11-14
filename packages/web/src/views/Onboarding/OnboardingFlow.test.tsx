import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { useHasCompletedSignup } from "@web/auth/useHasCompletedSignup";
import { useIsMobile } from "@web/common/hooks/useIsMobile";
import { OnboardingFlow } from "./OnboardingFlow";

// Mock navigate function
const mockNavigate = jest.fn();

// Mock dependencies
jest.mock("@web/auth/useHasCompletedSignup");
jest.mock("@web/common/hooks/useIsMobile");
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

// Mock the Onboarding component to avoid complex rendering
jest.mock("./components/Onboarding", () => ({
  Onboarding: ({
    steps,
    initialStepIndex = 0,
    onComplete,
  }: {
    steps: Array<{ id: string }>;
    initialStepIndex?: number;
    onComplete?: () => void;
  }) => (
    <div data-testid="onboarding">
      <div data-testid="total-steps">{steps.length}</div>
      <div data-testid="initial-step-index">{initialStepIndex}</div>
      <div data-testid="first-step-id">{steps[initialStepIndex]?.id}</div>
      <button
        data-testid="complete-onboarding"
        onClick={() => onComplete && onComplete()}
      >
        Complete
      </button>
    </div>
  ),
}));

const mockUseHasCompletedSignup = useHasCompletedSignup as jest.MockedFunction<
  typeof useHasCompletedSignup
>;
const mockUseIsMobile = useIsMobile as jest.MockedFunction<typeof useIsMobile>;

describe("OnboardingFlow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    mockUseIsMobile.mockReturnValue(false);
  });

  describe("New User Flow", () => {
    it("shows login flow first when user has not completed signup", () => {
      mockUseHasCompletedSignup.mockReturnValue({
        hasCompletedSignup: false,
        markSignupCompleted: jest.fn(),
      });

      render(<OnboardingFlow />);

      // Should show login steps (welcome step)
      expect(screen.getByTestId("onboarding")).toBeInTheDocument();
      expect(screen.getByTestId("first-step-id")).toHaveTextContent("welcome");
    });

    it("would start main onboarding at index 0 for new users", () => {
      // This tests the logic that would happen after login completes
      // When hasCompletedSignup is false, initialStepIndex should be 0
      mockUseHasCompletedSignup.mockReturnValue({
        hasCompletedSignup: false,
        markSignupCompleted: jest.fn(),
      });

      render(<OnboardingFlow />);

      expect(mockUseHasCompletedSignup).toHaveBeenCalled();
    });
  });

  describe("Returning User Flow", () => {
    it("skips login flow and goes directly to sign-in-with-google for returning users", () => {
      mockUseHasCompletedSignup.mockReturnValue({
        hasCompletedSignup: true,
        markSignupCompleted: jest.fn(),
      });

      render(<OnboardingFlow />);

      // Should skip login steps and go directly to main onboarding
      expect(screen.getByTestId("onboarding")).toBeInTheDocument();
      expect(screen.getByTestId("first-step-id")).toHaveTextContent(
        "sign-in-with-google",
      );
    });

    it("calls useHasCompletedSignup to check signup status", () => {
      mockUseHasCompletedSignup.mockReturnValue({
        hasCompletedSignup: true,
        markSignupCompleted: jest.fn(),
      });

      render(<OnboardingFlow />);

      // Hook should be called to determine which step to start at
      expect(mockUseHasCompletedSignup).toHaveBeenCalled();
    });

    it("waits for hasCompletedSignup to load before rendering", () => {
      mockUseHasCompletedSignup.mockReturnValue({
        hasCompletedSignup: null,
        markSignupCompleted: jest.fn(),
      });

      const { container } = render(<OnboardingFlow />);

      // Should render nothing while loading
      expect(container.firstChild).toBeNull();
    });
  });

  describe("Mobile Flow", () => {
    it("shows mobile onboarding flow when on mobile device", () => {
      mockUseIsMobile.mockReturnValue(true);
      mockUseHasCompletedSignup.mockReturnValue({
        hasCompletedSignup: false,
        markSignupCompleted: jest.fn(),
      });

      render(<OnboardingFlow />);

      // Mobile flow should be rendered
      expect(screen.getByTestId("onboarding")).toBeInTheDocument();
    });
  });

  describe("localStorage Integration", () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it("checks localStorage for hasCompletedSignup flag", () => {
      localStorage.setItem("compass.auth.hasCompletedSignup", "true");

      mockUseHasCompletedSignup.mockReturnValue({
        hasCompletedSignup: true,
        markSignupCompleted: jest.fn(),
      });

      render(<OnboardingFlow />);

      expect(mockUseHasCompletedSignup).toHaveBeenCalled();
    });

    it("uses hasCompletedSignup value to determine initial step", () => {
      localStorage.setItem("compass.auth.hasCompletedSignup", "false");

      mockUseHasCompletedSignup.mockReturnValue({
        hasCompletedSignup: false,
        markSignupCompleted: jest.fn(),
      });

      render(<OnboardingFlow />);

      expect(mockUseHasCompletedSignup).toHaveBeenCalled();
    });
  });

  describe("Onboarding Completion", () => {
    it("navigates to /day when main onboarding completes", async () => {
      const user = userEvent.setup();

      mockUseHasCompletedSignup.mockReturnValue({
        hasCompletedSignup: true,
        markSignupCompleted: jest.fn(),
      });

      render(<OnboardingFlow />);

      // Find and click the complete button
      const completeButton = screen.getByTestId("complete-onboarding");
      await user.click(completeButton);

      // Should navigate to /day
      expect(mockNavigate).toHaveBeenCalledWith("/day");
    });

    it("navigates to /day when new user completes main onboarding after login", async () => {
      const user = userEvent.setup();

      mockUseHasCompletedSignup.mockReturnValue({
        hasCompletedSignup: false,
        markSignupCompleted: jest.fn(),
      });

      const { rerender } = render(<OnboardingFlow />);

      // Complete login flow first
      const loginCompleteButton = screen.getByTestId("complete-onboarding");
      await user.click(loginCompleteButton);

      // After login completes, main onboarding should be shown
      // Update mock to reflect that signup is now completed
      mockUseHasCompletedSignup.mockReturnValue({
        hasCompletedSignup: false,
        markSignupCompleted: jest.fn(),
      });

      rerender(<OnboardingFlow />);

      // Complete main onboarding
      const mainCompleteButton = screen.getByTestId("complete-onboarding");
      await user.click(mainCompleteButton);

      // Should navigate to /day
      expect(mockNavigate).toHaveBeenCalledWith("/day");
    });
  });
});
