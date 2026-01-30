import {
  OnboardingGuideViewConfig,
  OnboardingStepConfig,
} from "../types/onboarding.guide.types";

export type { OnboardingStepName } from "../types/onboarding.guide.types";

/**
 * Command palette guide step names
 * Used for tracking completion of the interactive command palette guide
 */
export const ONBOARDING_STEPS = {
  NAVIGATE_TO_DAY: "navigateToDay",
  CREATE_TASK: "createTask",
  NAVIGATE_TO_NOW: "navigateToNow",
  EDIT_DESCRIPTION: "editDescription",
  EDIT_REMINDER: "editReminder",
  NAVIGATE_TO_WEEK: "navigateToWeek",
  CONNECT_GOOGLE_CALENDAR: "connectGoogleCalendar",
} as const;

/**
 * Ordered array of onboarding step configurations
 * This is the single source of truth for step order
 */
export const ONBOARDING_STEP_CONFIGS: readonly OnboardingStepConfig[] = [
  {
    id: ONBOARDING_STEPS.NAVIGATE_TO_DAY,
    order: 0,
    detectionType: "route",
    detectionConfig: { route: "/day", routePrefixes: ["/day/"] },
    guide: {
      instructionsByView: {
        day: [{ type: "text", value: "You're already on the Day view." }],
        default: [
          { type: "text", value: "Press " },
          { type: "kbd", value: "2" },
          { type: "text", value: " to go to the Day view" },
        ],
      },
    },
  },
  {
    id: ONBOARDING_STEPS.CREATE_TASK,
    order: 1,
    detectionType: "task-count",
    guide: {
      instructionsByView: {
        day: [
          { type: "text", value: "Type " },
          { type: "kbd", value: "c" },
          { type: "text", value: " to create a task" },
        ],
      },
    },
  },
  {
    id: ONBOARDING_STEPS.NAVIGATE_TO_NOW,
    order: 2,
    detectionType: "route",
    detectionConfig: { route: "/now", routePrefixes: ["/now/"] },
    guide: {
      instructionsByView: {
        default: [
          { type: "text", value: "Press " },
          { type: "kbd", value: "1" },
          { type: "text", value: " to go to the /now view" },
        ],
      },
    },
  },
  {
    id: ONBOARDING_STEPS.EDIT_DESCRIPTION,
    order: 3,
    detectionType: "task-description",
    guide: {
      instructionsByView: {
        default: [
          { type: "text", value: "Press " },
          { type: "kbd", value: "d" },
          { type: "text", value: " to edit the description" },
        ],
      },
    },
  },
  {
    id: ONBOARDING_STEPS.EDIT_REMINDER,
    order: 4,
    detectionType: "reminder-poll",
    guide: {
      instructionsByView: {
        default: [
          { type: "text", value: "Press " },
          { type: "kbd", value: "r" },
          { type: "text", value: " to edit the reminder" },
        ],
      },
    },
  },
  {
    id: ONBOARDING_STEPS.NAVIGATE_TO_WEEK,
    order: 5,
    detectionType: "route",
    detectionConfig: { route: "/" },
    guide: {
      instructionsByView: {
        default: [
          { type: "text", value: "Type " },
          { type: "kbd", value: "3" },
          { type: "text", value: " to go to the week view" },
        ],
      },
    },
  },
  {
    id: ONBOARDING_STEPS.CONNECT_GOOGLE_CALENDAR,
    order: 6,
    detectionType: "google-auth",
    guide: {
      title: "Bring your events",
      instructionsByView: {
        default: [
          { type: "meta-key" },
          { type: "text", value: " + " },
          { type: "kbd", value: "K" },
          { type: "text", value: ", then select " },
          { type: "kbd", value: "Connect Google Calendar" },
        ],
      },
    },
  },
] as const;

export const ONBOARDING_GUIDE_VIEWS: readonly OnboardingGuideViewConfig[] = [
  {
    id: "now",
    label: "Now",
    routes: ["/now"],
    routePrefixes: ["/now/"],
    overlayVariant: "pinned",
  },
  {
    id: "day",
    label: "Day",
    routes: ["/day"],
    routePrefixes: ["/day/"],
    overlayVariant: "centered",
  },
  {
    id: "week",
    label: "Week",
    routes: ["/"],
    overlayVariant: "centered",
  },
  {
    id: "unknown",
    label: "Compass",
    routes: [],
    overlayVariant: "centered",
  },
] as const;

/**
 * Custom event name for restarting the onboarding guide
 * Dispatched when user clicks "Re-do onboarding" in command palette
 */
export const ONBOARDING_RESTART_EVENT = "compass:restart-onboarding" as const;
