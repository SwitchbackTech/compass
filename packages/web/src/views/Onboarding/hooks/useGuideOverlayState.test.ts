import { useLocation } from "react-router-dom";
import { renderHook } from "@testing-library/react";
import { ONBOARDING_STEPS } from "../constants/onboarding.constants";
import { markStepCompleted } from "../utils/onboarding.storage.util";
import { useGuideOverlayState } from "./useGuideOverlayState";

jest.mock("react-router-dom", () => ({
  useLocation: jest.fn(),
}));

const mockUseLocation = useLocation as jest.MockedFunction<typeof useLocation>;

describe("useGuideOverlayState", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe("currentView", () => {
    it("should return 'day' for /day pathname", () => {
      mockUseLocation.mockReturnValue({ pathname: "/day" } as any);
      const { result } = renderHook(() =>
        useGuideOverlayState({
          currentStep: ONBOARDING_STEPS.NAVIGATE_TO_DAY,
          isSuccessMessageDismissed: false,
        }),
      );

      expect(result.current.currentView).toBe("day");
    });

    it("should return 'now' for /now pathname", () => {
      mockUseLocation.mockReturnValue({ pathname: "/now" } as any);
      const { result } = renderHook(() =>
        useGuideOverlayState({
          currentStep: ONBOARDING_STEPS.NAVIGATE_TO_DAY,
          isSuccessMessageDismissed: false,
        }),
      );

      expect(result.current.currentView).toBe("now");
    });

    it("should return 'week' for / pathname", () => {
      mockUseLocation.mockReturnValue({ pathname: "/" } as any);
      const { result } = renderHook(() =>
        useGuideOverlayState({
          currentStep: ONBOARDING_STEPS.NAVIGATE_TO_DAY,
          isSuccessMessageDismissed: false,
        }),
      );

      expect(result.current.currentView).toBe("week");
    });
  });

  describe("overlayVariant", () => {
    it("should return 'pinned' for Now view", () => {
      mockUseLocation.mockReturnValue({ pathname: "/now" } as any);
      const { result } = renderHook(() =>
        useGuideOverlayState({
          currentStep: ONBOARDING_STEPS.NAVIGATE_TO_DAY,
          isSuccessMessageDismissed: false,
        }),
      );

      expect(result.current.overlayVariant).toBe("pinned");
    });

    it("should return 'centered' for Day view", () => {
      mockUseLocation.mockReturnValue({ pathname: "/day" } as any);
      const { result } = renderHook(() =>
        useGuideOverlayState({
          currentStep: ONBOARDING_STEPS.NAVIGATE_TO_DAY,
          isSuccessMessageDismissed: false,
        }),
      );

      expect(result.current.overlayVariant).toBe("centered");
    });
  });

  describe("actualStep", () => {
    it("should return first incomplete step when step skipped ahead", () => {
      mockUseLocation.mockReturnValue({ pathname: "/now" } as any);
      // Current step is 3 but step 1 is not completed
      const { result } = renderHook(() =>
        useGuideOverlayState({
          currentStep: ONBOARDING_STEPS.NAVIGATE_TO_NOW,
          isSuccessMessageDismissed: false,
        }),
      );

      // Should show step 1 since it's not completed
      expect(result.current.actualStep).toBe(ONBOARDING_STEPS.NAVIGATE_TO_DAY);
    });

    it("should return current step when previous steps are completed", () => {
      mockUseLocation.mockReturnValue({ pathname: "/now" } as any);
      markStepCompleted(ONBOARDING_STEPS.NAVIGATE_TO_DAY);
      markStepCompleted(ONBOARDING_STEPS.CREATE_TASK);

      const { result } = renderHook(() =>
        useGuideOverlayState({
          currentStep: ONBOARDING_STEPS.NAVIGATE_TO_NOW,
          isSuccessMessageDismissed: false,
        }),
      );

      expect(result.current.actualStep).toBe(ONBOARDING_STEPS.NAVIGATE_TO_NOW);
    });

    it("should return null when currentStep is null", () => {
      mockUseLocation.mockReturnValue({ pathname: "/day" } as any);
      const { result } = renderHook(() =>
        useGuideOverlayState({
          currentStep: null,
          isSuccessMessageDismissed: false,
        }),
      );

      expect(result.current.actualStep).toBe(null);
    });
  });

  describe("welcomeMessage", () => {
    it("should return correct message for Day view", () => {
      mockUseLocation.mockReturnValue({ pathname: "/day" } as any);
      const { result } = renderHook(() =>
        useGuideOverlayState({
          currentStep: ONBOARDING_STEPS.NAVIGATE_TO_DAY,
          isSuccessMessageDismissed: false,
        }),
      );

      expect(result.current.welcomeMessage).toBe("Welcome to the Day View");
    });

    it("should return correct message for Now view", () => {
      mockUseLocation.mockReturnValue({ pathname: "/now" } as any);
      const { result } = renderHook(() =>
        useGuideOverlayState({
          currentStep: ONBOARDING_STEPS.NAVIGATE_TO_DAY,
          isSuccessMessageDismissed: false,
        }),
      );

      expect(result.current.welcomeMessage).toBe("Welcome to the Now View");
    });
  });

  describe("showSuccessMessage", () => {
    it("should be true when connectGoogleCalendar is completed and not dismissed", () => {
      mockUseLocation.mockReturnValue({ pathname: "/day" } as any);
      markStepCompleted(ONBOARDING_STEPS.CONNECT_GOOGLE_CALENDAR);

      const { result } = renderHook(() =>
        useGuideOverlayState({
          currentStep: null,
          isSuccessMessageDismissed: false,
        }),
      );

      expect(result.current.showSuccessMessage).toBe(true);
    });

    it("should be false when success message is dismissed", () => {
      mockUseLocation.mockReturnValue({ pathname: "/day" } as any);
      markStepCompleted(ONBOARDING_STEPS.CONNECT_GOOGLE_CALENDAR);

      const { result } = renderHook(() =>
        useGuideOverlayState({
          currentStep: null,
          isSuccessMessageDismissed: true,
        }),
      );

      expect(result.current.showSuccessMessage).toBe(false);
    });

    it("should be false when connectGoogleCalendar is not completed", () => {
      mockUseLocation.mockReturnValue({ pathname: "/day" } as any);

      const { result } = renderHook(() =>
        useGuideOverlayState({
          currentStep: ONBOARDING_STEPS.NAVIGATE_TO_DAY,
          isSuccessMessageDismissed: false,
        }),
      );

      expect(result.current.showSuccessMessage).toBe(false);
    });
  });

  describe("instructionParts", () => {
    it("should return view-specific instructions when available", () => {
      mockUseLocation.mockReturnValue({ pathname: "/day" } as any);
      markStepCompleted(ONBOARDING_STEPS.NAVIGATE_TO_DAY);

      const { result } = renderHook(() =>
        useGuideOverlayState({
          currentStep: ONBOARDING_STEPS.CREATE_TASK,
          isSuccessMessageDismissed: false,
        }),
      );

      // Step 2 has day-specific instructions
      expect(result.current.instructionParts).toEqual([
        { type: "text", value: "Type " },
        { type: "kbd", value: "c" },
        { type: "text", value: " to create a task" },
      ]);
    });

    it("should fall back to default instructions when view-specific not available", () => {
      mockUseLocation.mockReturnValue({ pathname: "/now" } as any);
      markStepCompleted(ONBOARDING_STEPS.NAVIGATE_TO_DAY);
      markStepCompleted(ONBOARDING_STEPS.CREATE_TASK);
      markStepCompleted(ONBOARDING_STEPS.NAVIGATE_TO_NOW);

      const { result } = renderHook(() =>
        useGuideOverlayState({
          currentStep: ONBOARDING_STEPS.NAVIGATE_TO_WEEK,
          isSuccessMessageDismissed: false,
        }),
      );

      // Step 4 only has default instructions
      expect(result.current.instructionParts).toEqual([
        { type: "text", value: "Type " },
        { type: "kbd", value: "3" },
        { type: "text", value: " to go to the week view" },
      ]);
    });
  });

  describe("stepNumber and stepText", () => {
    it("should return correct step number for step 1", () => {
      mockUseLocation.mockReturnValue({ pathname: "/now" } as any);
      const { result } = renderHook(() =>
        useGuideOverlayState({
          currentStep: ONBOARDING_STEPS.NAVIGATE_TO_DAY,
          isSuccessMessageDismissed: false,
        }),
      );

      expect(result.current.stepNumber).toBe(1);
      expect(result.current.stepText).toBe("Step 1 of 5");
    });

    it("should return correct step number for step 3", () => {
      mockUseLocation.mockReturnValue({ pathname: "/now" } as any);
      markStepCompleted(ONBOARDING_STEPS.NAVIGATE_TO_DAY);
      markStepCompleted(ONBOARDING_STEPS.CREATE_TASK);

      const { result } = renderHook(() =>
        useGuideOverlayState({
          currentStep: ONBOARDING_STEPS.NAVIGATE_TO_NOW,
          isSuccessMessageDismissed: false,
        }),
      );

      expect(result.current.stepNumber).toBe(3);
      expect(result.current.stepText).toBe("Step 3 of 5");
    });

    it("should return 'All steps completed' when showing success message", () => {
      mockUseLocation.mockReturnValue({ pathname: "/day" } as any);
      markStepCompleted(ONBOARDING_STEPS.CONNECT_GOOGLE_CALENDAR);

      const { result } = renderHook(() =>
        useGuideOverlayState({
          currentStep: null,
          isSuccessMessageDismissed: false,
        }),
      );

      expect(result.current.stepNumber).toBe(null);
      expect(result.current.stepText).toBe("All steps completed");
    });
  });

  describe("isNowViewOverlay", () => {
    it("should be true for Now view when not showing success message", () => {
      mockUseLocation.mockReturnValue({ pathname: "/now" } as any);
      const { result } = renderHook(() =>
        useGuideOverlayState({
          currentStep: ONBOARDING_STEPS.NAVIGATE_TO_DAY,
          isSuccessMessageDismissed: false,
        }),
      );

      expect(result.current.isNowViewOverlay).toBe(true);
    });

    it("should be false for Now view when showing success message", () => {
      mockUseLocation.mockReturnValue({ pathname: "/now" } as any);
      markStepCompleted(ONBOARDING_STEPS.CONNECT_GOOGLE_CALENDAR);

      const { result } = renderHook(() =>
        useGuideOverlayState({
          currentStep: null,
          isSuccessMessageDismissed: false,
        }),
      );

      expect(result.current.isNowViewOverlay).toBe(false);
    });

    it("should be false for Day view", () => {
      mockUseLocation.mockReturnValue({ pathname: "/day" } as any);
      const { result } = renderHook(() =>
        useGuideOverlayState({
          currentStep: ONBOARDING_STEPS.NAVIGATE_TO_DAY,
          isSuccessMessageDismissed: false,
        }),
      );

      expect(result.current.isNowViewOverlay).toBe(false);
    });
  });

  describe("totalSteps", () => {
    it("should return 7 (the total number of steps)", () => {
      mockUseLocation.mockReturnValue({ pathname: "/day" } as any);
      const { result } = renderHook(() =>
        useGuideOverlayState({
          currentStep: ONBOARDING_STEPS.NAVIGATE_TO_DAY,
          isSuccessMessageDismissed: false,
        }),
      );

      expect(result.current.totalSteps).toBe(5);
    });
  });
});
