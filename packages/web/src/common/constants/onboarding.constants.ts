import { z } from "zod";

const CompletedStepsSchema = z.array(
  z.enum([
    "navigateToDay",
    "createTask",
    "navigateToNow",
    "editDescription",
    "editReminder",
    "navigateToWeek",
  ]),
);
export const OnboardingProgressSchema = z.object({
  completedSteps: CompletedStepsSchema.default([]),
  isSeen: z.boolean().default(false),
  isCompleted: z.boolean().default(false),
  isStorageWarningSeen: z.boolean().default(false),
  isSignupComplete: z.boolean().default(false),
  isOnboardingSkipped: z.boolean().default(false),
  isAuthPromptDismissed: z.boolean().default(false),
});

export type OnboardingProgress = z.infer<typeof OnboardingProgressSchema>;

export const DEFAULT_ONBOARDING_PROGRESS: OnboardingProgress = {
  completedSteps: [],
  isSeen: false,
  isCompleted: false,
  isStorageWarningSeen: false,
  isSignupComplete: false,
  isOnboardingSkipped: false,
  isAuthPromptDismissed: false,
};
