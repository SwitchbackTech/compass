export type OnboardingGuideView = "day" | "now" | "week" | "unknown";

export interface OnboardingGuideViewConfig {
  id: OnboardingGuideView;
  label: string;
  routes: string[];
  routePrefixes?: string[];
  overlayVariant: "pinned" | "centered";
}

interface OnboardingInstructionText {
  type: "text";
  value: string;
}

interface OnboardingInstructionKey {
  type: "kbd";
  value: string;
}

export type OnboardingInstructionPart =
  | OnboardingInstructionText
  | OnboardingInstructionKey;

export type OnboardingInstructionVariant = OnboardingGuideView | "default";

export type OnboardingStepName =
  | "navigateToDay"
  | "createTask"
  | "navigateToNow"
  | "editDescription"
  | "editReminder"
  | "navigateToWeek";

/**
 * Detection types for onboarding steps
 */
export type StepDetectionType =
  | "task-count"
  | "route"
  | "task-description"
  | "reminder-poll";

/**
 * Step configuration with order and detection metadata
 */
export interface OnboardingStepConfig {
  id: OnboardingStepName;
  order: number;
  detectionType: StepDetectionType;
  detectionConfig?: { route: string };
  guide: {
    visibilityByAuth: {
      authenticated: OnboardingGuideView[];
      unauthenticated: OnboardingGuideView[];
    };
    instructionsByView: Partial<
      Record<OnboardingInstructionVariant, OnboardingInstructionPart[]>
    >;
  };
}
