import { act, renderHook } from "@testing-library/react";
import { CompassSession } from "@web/auth/session/session.types";
import { ONBOARDING_STEPS } from "@web/views/Onboarding/constants/onboarding.constants";
import { useOnboardingOverlay } from "@web/views/Onboarding/hooks/useOnboardingOverlay";
import {
  getOnboardingProgress,
  updateOnboardingProgress,
} from "@web/views/Onboarding/utils/onboarding.storage.util";

// Mock useSession
jest.mock("@web/auth/hooks/useSession", () => ({
  useSession: jest.fn(() => ({
    authenticated: false,
    loading: false,
    isSyncing: false,
    setAuthenticated: jest.fn(),
    setLoading: jest.fn(),
    setIsSyncing: jest.fn(),
  })),
}));

// Mock useCmdPaletteGuide
const mockUseCmdPaletteGuide = jest.fn();
jest.mock("@web/views/Onboarding/hooks/useCmdPaletteGuide", () => ({
  useCmdPaletteGuide: () => mockUseCmdPaletteGuide(),
}));

describe("useOnboardingOverlay", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    // Default mock - guide active on step 1
    // The mock checks onboarding progress to determine if guide is completed
    mockUseCmdPaletteGuide.mockImplementation(() => {
      const progress = getOnboardingProgress();
      const isCompleted = progress.isCompleted;
      return {
        currentStep: isCompleted ? null : ONBOARDING_STEPS.NAVIGATE_TO_DAY,
        isGuideActive: !isCompleted,
        skipGuide: jest.fn(() => {
          updateOnboardingProgress({ isCompleted: true });
        }),
        completeStep: jest.fn(),
        completeGuide: jest.fn(),
      };
    });
  });

  it("should show onboarding overlay when guide is active on step 1 for unauthenticated users", () => {
    const { result } = renderHook(() => useOnboardingOverlay());

    expect(result.current.showOnboardingOverlay).toBe(true);
    expect(result.current.currentStep).toBe(ONBOARDING_STEPS.NAVIGATE_TO_DAY);
  });

  it("should show onboarding overlay when guide is active on step 2 for unauthenticated users", () => {
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: ONBOARDING_STEPS.CREATE_TASK,
      isGuideActive: true,
      skipGuide: jest.fn(),
      completeStep: jest.fn(),
      completeGuide: jest.fn(),
    });

    const { result } = renderHook(() => useOnboardingOverlay());

    expect(result.current.currentStep).toBe(ONBOARDING_STEPS.CREATE_TASK);
    expect(result.current.showOnboardingOverlay).toBe(true);
  });

  it("should not show onboarding overlay when guide is on step 3 (Now view step)", () => {
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: ONBOARDING_STEPS.NAVIGATE_TO_NOW,
      isGuideActive: true,
      skipGuide: jest.fn(),
      completeStep: jest.fn(),
      completeGuide: jest.fn(),
    });

    const { result } = renderHook(() => useOnboardingOverlay());

    // Overlay should not show on step 3 (it's for Now view, not Day view)
    expect(result.current.currentStep).toBe(ONBOARDING_STEPS.NAVIGATE_TO_NOW);
    expect(result.current.showOnboardingOverlay).toBe(false);
  });

  it("should not show onboarding overlay if guide is completed", () => {
    updateOnboardingProgress({ isCompleted: true });
    // Mock should reflect completed state
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: null,
      isGuideActive: false,
      skipGuide: jest.fn(),
      completeStep: jest.fn(),
      completeGuide: jest.fn(),
    });

    const { result } = renderHook(() => useOnboardingOverlay());

    expect(result.current.showOnboardingOverlay).toBe(false);
  });

  it("should not show onboarding overlay for authenticated users", () => {
    const { useSession } = require("@web/auth/hooks/useSession");
    const mockSession: CompassSession = {
      authenticated: true,
      loading: false,
      isSyncing: false,
      setAuthenticated: jest.fn(),
      setLoading: jest.fn(),
      setIsSyncing: jest.fn(),
    };
    useSession.mockReturnValue(mockSession);

    const { result } = renderHook(() => useOnboardingOverlay());

    expect(result.current.showOnboardingOverlay).toBe(false);
  });

  it("should not show onboarding overlay when guide is completed", () => {
    const { useSession } = require("@web/auth/hooks/useSession");
    const mockSession: CompassSession = {
      authenticated: false,
      loading: false,
      isSyncing: false,
      setAuthenticated: jest.fn(),
      setLoading: jest.fn(),
      setIsSyncing: jest.fn(),
    };
    useSession.mockReturnValue(mockSession);

    // Set guide as completed
    updateOnboardingProgress({ isCompleted: true });
    // Mock should reflect completed state
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: null,
      isGuideActive: false,
      skipGuide: jest.fn(),
      completeStep: jest.fn(),
      completeGuide: jest.fn(),
    });

    const { result } = renderHook(() => useOnboardingOverlay());

    // Overlay should not show when guide is completed
    expect(result.current.showOnboardingOverlay).toBe(false);
  });

  it("should skip guide when dismissed", () => {
    // Reset mock to ensure authenticated is false
    const { useSession } = require("@web/auth/hooks/useSession");
    const mockSession: CompassSession = {
      authenticated: false,
      loading: false,
      isSyncing: false,
      setAuthenticated: jest.fn(),
      setLoading: jest.fn(),
      setIsSyncing: jest.fn(),
    };
    useSession.mockReturnValue(mockSession);

    const skipGuideFn = jest.fn(() => {
      updateOnboardingProgress({ isCompleted: true });
    });

    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: ONBOARDING_STEPS.NAVIGATE_TO_DAY,
      isGuideActive: true,
      skipGuide: skipGuideFn,
      completeStep: jest.fn(),
      completeGuide: jest.fn(),
    });

    const { result } = renderHook(() => useOnboardingOverlay());

    expect(result.current.showOnboardingOverlay).toBe(true);

    act(() => {
      result.current.dismissOnboardingOverlay();
    });

    // Verify skipGuide was called and onboarding progress was updated
    expect(skipGuideFn).toHaveBeenCalled();
    const progress = getOnboardingProgress();
    expect(progress.isCompleted).toBe(true);
  });
});
