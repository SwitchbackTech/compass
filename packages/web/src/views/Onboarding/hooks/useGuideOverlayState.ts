import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import {
  ONBOARDING_GUIDE_VIEWS,
  ONBOARDING_STEPS,
  ONBOARDING_STEP_CONFIGS,
  OnboardingStepName,
} from "../constants/onboarding.constants";
import {
  OnboardingGuideView,
  OnboardingInstructionPart,
} from "../types/onboarding.guide.types";
import { isStepCompleted } from "../utils/onboarding.storage.util";
import {
  getGuideViewFromPathname,
  getGuideWelcomeMessage,
} from "../utils/onboarding.util";

export interface GuideOverlayState {
  /** Current view based on pathname (day, now, week, unknown) */
  currentView: OnboardingGuideView;
  /** Overlay positioning variant - pinned for Now view, centered for others */
  overlayVariant: "pinned" | "centered";
  /** The actual step to display (first incomplete step) */
  actualStep: OnboardingStepName | null;
  /** Config for the actual step */
  actualStepConfig: (typeof ONBOARDING_STEP_CONFIGS)[number] | null;
  /** Welcome message based on current view */
  welcomeMessage: string;
  /** Whether to show the success message (all steps completed) */
  showSuccessMessage: boolean;
  /** Instruction parts for the current step and view */
  instructionParts: OnboardingInstructionPart[];
  /** Current step number (1-indexed) */
  stepNumber: number | null;
  /** Total number of steps */
  totalSteps: number;
  /** Step progress text (e.g., "Step 1 of 6") */
  stepText: string;
  /** Whether this is the Now view pinned variant */
  isNowViewOverlay: boolean;
}

interface UseGuideOverlayStateOptions {
  currentStep: OnboardingStepName | null;
  isSuccessMessageDismissed: boolean;
}

/**
 * Hook to compute the display state for the guide overlay.
 * Extracts the complex computed logic from CmdPaletteGuide.
 */
export function useGuideOverlayState({
  currentStep,
  isSuccessMessageDismissed,
}: UseGuideOverlayStateOptions): GuideOverlayState {
  const location = useLocation();

  const currentView = useMemo(
    () => getGuideViewFromPathname(location.pathname),
    [location.pathname],
  );

  const viewConfig = useMemo(
    () => ONBOARDING_GUIDE_VIEWS.find((config) => config.id === currentView),
    [currentView],
  );

  const overlayVariant = viewConfig?.overlayVariant ?? "centered";

  // Determine actual step based on completion status
  // If on step 2 but step 1 wasn't completed, show step 1 instead
  const actualStep = useMemo(() => {
    if (currentStep === null) return null;
    const firstIncomplete = ONBOARDING_STEP_CONFIGS.find(
      (config) => !isStepCompleted(config.id),
    );
    return firstIncomplete?.id ?? currentStep;
  }, [currentStep]);

  const actualStepConfig = useMemo(
    () =>
      actualStep
        ? (ONBOARDING_STEP_CONFIGS.find((config) => config.id === actualStep) ??
          null)
        : null,
    [actualStep],
  );

  const welcomeMessage = useMemo(
    () => actualStepConfig?.guide.title ?? getGuideWelcomeMessage(currentView),
    [actualStepConfig, currentView],
  );

  // Check if connectGoogleCalendar step is completed (show success message on any view)
  const showSuccessMessage =
    isStepCompleted(ONBOARDING_STEPS.CONNECT_GOOGLE_CALENDAR) &&
    !isSuccessMessageDismissed;

  const instructionParts = useMemo(
    () =>
      actualStepConfig?.guide.instructionsByView[currentView] ??
      actualStepConfig?.guide.instructionsByView.default ??
      [],
    [actualStepConfig, currentView],
  );

  const stepNumber = useMemo(() => {
    if (showSuccessMessage) return null;
    if (!actualStep) return 0;
    const config = ONBOARDING_STEP_CONFIGS.find((c) => c.id === actualStep);
    return config ? config.order + 1 : 0;
  }, [actualStep, showSuccessMessage]);

  const stepText = showSuccessMessage
    ? "All steps completed"
    : `Step ${stepNumber} of ${ONBOARDING_STEP_CONFIGS.length}`;

  const isNowViewOverlay = overlayVariant === "pinned" && !showSuccessMessage;

  return {
    currentView,
    overlayVariant,
    actualStep,
    actualStepConfig,
    welcomeMessage,
    showSuccessMessage,
    instructionParts,
    stepNumber,
    totalSteps: ONBOARDING_STEP_CONFIGS.length,
    stepText,
    isNowViewOverlay,
  };
}
