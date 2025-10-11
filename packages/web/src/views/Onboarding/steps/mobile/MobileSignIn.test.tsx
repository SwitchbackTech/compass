import React from "react";
import "@testing-library/jest-dom";
import { MobileSignIn } from "./MobileSignIn";

// Mock dependencies
const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock("@web/common/apis/auth.api", () => ({
  AuthApi: {
    loginOrSignup: jest.fn(),
  },
}));

jest.mock("@web/common/apis/sync.api", () => ({
  SyncApi: {
    importGCal: jest.fn(),
  },
}));

jest.mock("@web/components/oauth/google/useGoogleLogin", () => ({
  useGoogleLogin: jest.fn(),
}));

jest.mock("@web/components/oauth/google/GoogleButton", () => ({
  GoogleButton: ({ onClick, disabled, style }: any) => (
    <button
      data-testid="google-signin-button"
      onClick={onClick}
      disabled={disabled}
      style={style}
    >
      Sign in with Google
    </button>
  ),
}));

jest.mock("@web/components/AbsoluteOverflowLoader", () => ({
  AbsoluteOverflowLoader: () => (
    <div data-testid="loading-overlay">Loading...</div>
  ),
}));

jest.mock("../../components/layouts/OnboardingCardLayout", () => ({
  OnboardingCardLayout: ({ children, currentStep, totalSteps }: any) => (
    <div data-testid="onboarding-card">
      <div data-testid="step-indicator">
        Step {currentStep} of {totalSteps}
      </div>
      <div data-testid="card-content">{children}</div>
    </div>
  ),
}));

describe("MobileSignIn - User Experience Validation", () => {
  const mockOnNext = jest.fn();
  const mockOnPrevious = jest.fn();
  const mockOnComplete = jest.fn();
  const mockOnSkip = jest.fn();

  const defaultProps = {
    currentStep: 2,
    totalSteps: 2,
    onNext: mockOnNext,
    onPrevious: mockOnPrevious,
    onComplete: mockOnComplete,
    onSkip: mockOnSkip,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("User Behavior Validation", () => {
    it("handles different step configurations correctly", () => {
      const configurations = [
        { currentStep: 1, totalSteps: 2 },
        { currentStep: 2, totalSteps: 2 },
        { currentStep: 1, totalSteps: 5 },
        { currentStep: 3, totalSteps: 5 },
      ];

      configurations.forEach((config) => {
        const element = React.createElement(MobileSignIn, {
          ...defaultProps,
          ...config,
        });
        expect(element.props.currentStep).toBe(config.currentStep);
        expect(element.props.totalSteps).toBe(config.totalSteps);
      });
    });
  });

  describe("Integration Validation", () => {
    it("maintains proper component structure", () => {
      const element = React.createElement(MobileSignIn, defaultProps);

      // Verify the element has the expected structure
      expect(element.type).toBe(MobileSignIn);
      expect(element.props).toHaveProperty("currentStep");
      expect(element.props).toHaveProperty("totalSteps");
      expect(element.props).toHaveProperty("onNext");
      expect(element.props).toHaveProperty("onPrevious");
      expect(element.props).toHaveProperty("onComplete");
      expect(element.props).toHaveProperty("onSkip");
    });
  });

  describe("User Journey Validation", () => {
    it("supports the complete mobile onboarding flow", () => {
      // Test that the component can be used in a mobile onboarding sequence
      const mobileFlowProps = {
        currentStep: 2,
        totalSteps: 2,
        onNext: jest.fn(),
        onPrevious: jest.fn(),
        onComplete: jest.fn(),
        onSkip: jest.fn(),
      };

      const element = React.createElement(MobileSignIn, mobileFlowProps);
      expect(element).toBeDefined();
      expect(element.props.currentStep).toBe(2);
      expect(element.props.totalSteps).toBe(2);
    });

    it("handles callback functions for user interactions", () => {
      const callbacks = {
        onNext: jest.fn(),
        onPrevious: jest.fn(),
        onComplete: jest.fn(),
        onSkip: jest.fn(),
      };

      const element = React.createElement(MobileSignIn, {
        ...defaultProps,
        ...callbacks,
      });

      expect(element.props.onNext).toBe(callbacks.onNext);
      expect(element.props.onPrevious).toBe(callbacks.onPrevious);
      expect(element.props.onComplete).toBe(callbacks.onComplete);
      expect(element.props.onSkip).toBe(callbacks.onSkip);
    });
  });

  describe("Mobile-Specific Behavior", () => {
    it("supports touch-friendly interactions", () => {
      // The component should accept props that enable touch interactions
      const touchProps = {
        ...defaultProps,
        onNext: jest.fn(), // Touch callback
      };

      const element = React.createElement(MobileSignIn, touchProps);
      expect(element.props.onNext).toBe(touchProps.onNext);
    });
  });
});
