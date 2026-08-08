import { getModifierKeyLabel } from "@web/shortcuts/shortcut.util";

export type OnboardingTourStepId =
  | "create"
  | "save"
  | "palette"
  | "shortcuts"
  | "done";

export type OnboardingTourStep = {
  id: OnboardingTourStepId;
  title: string;
  body: string;
  /** Shown as a kbd hint under the body when set. */
  shortcutHint?: string;
};

export const ONBOARDING_TOUR_STEP_IDS: OnboardingTourStepId[] = [
  "create",
  "save",
  "palette",
  "shortcuts",
  "done",
];

export function getOnboardingTourSteps(): OnboardingTourStep[] {
  const mod = getModifierKeyLabel();
  return [
    {
      id: "create",
      title: "Create with the keyboard",
      body: "Press C to start a timed event. You can also click the grid, but the keys are faster.",
      shortcutHint: "C",
    },
    {
      id: "save",
      title: "Name it and save",
      body: "Type a title, then press Enter to save. Changes show up instantly.",
      shortcutHint: "Enter",
    },
    {
      id: "palette",
      title: "Open the command palette",
      body: `Press ${mod}+K for commands. Try "Show keyboard shortcuts", then close with Escape.`,
      shortcutHint: `${mod}+K`,
    },
    {
      id: "shortcuts",
      title: "Browse every shortcut",
      body: "Press ? to open the shortcut legend. Search it anytime you forget a key.",
      shortcutHint: "?",
    },
    {
      id: "done",
      title: "You are ready",
      body: "Sample events are already on your calendar. Reopen this tour from the command palette anytime.",
    },
  ];
}

export function getNextOnboardingStepId(
  current: OnboardingTourStepId,
): OnboardingTourStepId | null {
  const index = ONBOARDING_TOUR_STEP_IDS.indexOf(current);
  if (index < 0 || index >= ONBOARDING_TOUR_STEP_IDS.length - 1) return null;
  return ONBOARDING_TOUR_STEP_IDS[index + 1] ?? null;
}
