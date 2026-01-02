import { act, renderHook, waitFor } from "@testing-library/react";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { useOnboardingOverlay } from "./useOnboardingOverlay";

// Mock useSession
jest.mock("@web/common/hooks/useSession", () => ({
  useSession: jest.fn(() => ({ authenticated: false })),
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
    // The mock checks localStorage to determine if guide is completed
    mockUseCmdPaletteGuide.mockImplementation(() => {
      const isCompleted =
        localStorage.getItem(STORAGE_KEYS.CMD_PALETTE_GUIDE_COMPLETED) ===
        "true";
      return {
        currentStep: isCompleted ? null : 1,
        isGuideActive: !isCompleted,
        skipGuide: jest.fn(() => {
          localStorage.setItem(
            STORAGE_KEYS.CMD_PALETTE_GUIDE_COMPLETED,
            "true",
          );
        }),
        completeStep: jest.fn(),
        completeGuide: jest.fn(),
      };
    });
  });

  it("should show onboarding overlay when guide is active on step 1 for unauthenticated users", () => {
    const { result } = renderHook(() => useOnboardingOverlay());

    expect(result.current.showOnboardingOverlay).toBe(true);
    expect(result.current.currentStep).toBe(1);
  });

  it("should show onboarding overlay when guide is active on step 2 for unauthenticated users", () => {
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: 2,
      isGuideActive: true,
      skipGuide: jest.fn(),
      completeStep: jest.fn(),
      completeGuide: jest.fn(),
    });

    const { result } = renderHook(() => useOnboardingOverlay());

    expect(result.current.currentStep).toBe(2);
    expect(result.current.showOnboardingOverlay).toBe(true);
  });

  it("should not show onboarding overlay when guide is on step 3 (Now view step)", () => {
    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: 3,
      isGuideActive: true,
      skipGuide: jest.fn(),
      completeStep: jest.fn(),
      completeGuide: jest.fn(),
    });

    const { result } = renderHook(() => useOnboardingOverlay());

    // Overlay should not show on step 3 (it's for Now view, not Day view)
    expect(result.current.currentStep).toBe(3);
    expect(result.current.showOnboardingOverlay).toBe(false);
  });

  it("should not show onboarding overlay if guide is completed", () => {
    localStorage.setItem(STORAGE_KEYS.CMD_PALETTE_GUIDE_COMPLETED, "true");
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
    const { useSession } = require("@web/common/hooks/useSession");
    useSession.mockReturnValue({ authenticated: true });

    const { result } = renderHook(() => useOnboardingOverlay());

    expect(result.current.showOnboardingOverlay).toBe(false);
  });

  it("should not show onboarding overlay when guide is completed", () => {
    const { useSession } = require("@web/common/hooks/useSession");
    useSession.mockReturnValue({ authenticated: false });

    // Set guide as completed
    localStorage.setItem(STORAGE_KEYS.CMD_PALETTE_GUIDE_COMPLETED, "true");
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
    const { useSession } = require("@web/common/hooks/useSession");
    useSession.mockReturnValue({ authenticated: false });

    const skipGuideFn = jest.fn(() => {
      localStorage.setItem(STORAGE_KEYS.CMD_PALETTE_GUIDE_COMPLETED, "true");
    });

    mockUseCmdPaletteGuide.mockReturnValue({
      currentStep: 1,
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

    // Verify skipGuide was called and localStorage was set
    expect(skipGuideFn).toHaveBeenCalled();
    expect(localStorage.getItem(STORAGE_KEYS.CMD_PALETTE_GUIDE_COMPLETED)).toBe(
      "true",
    );
  });
});
