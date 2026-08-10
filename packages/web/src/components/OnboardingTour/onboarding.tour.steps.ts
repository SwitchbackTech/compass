import { getModifierKeyLabel } from "@web/shortcuts/shortcut.util";

/** Single source of truth for step order; the type and id list below derive from it. */
const STEP_IDS = ["create", "save", "palette", "shortcuts", "done"] as const;

export type OnboardingTourStepId = (typeof STEP_IDS)[number];

export const ONBOARDING_TOUR_STEP_IDS: OnboardingTourStepId[] = [...STEP_IDS];

export type OnboardingTourStep = {
  id: OnboardingTourStepId;
  title: string;
  body: string;
  /** Shown as a kbd hint under the body when set. */
  shortcutHint?: string;
};

export function getOnboardingTourSteps(): OnboardingTourStep[] {
  const mod = getModifierKeyLabel();
  const content: Record<
    OnboardingTourStepId,
    Omit<OnboardingTourStep, "id">
  > = {
    create: {
      title: "Create with the keyboard",
      body: "Press C to start a timed event. You can also click the grid, but the keys are faster.",
      shortcutHint: "C",
    },
    save: {
      title: "Name it and save",
      body: "Type a title, then press Enter to save. Changes show up instantly.",
      shortcutHint: "Enter",
    },
    palette: {
      title: "Open the command palette",
      body: `Press ${mod}+K for commands. Browse or search, then close with Escape.`,
      shortcutHint: `${mod}+K`,
    },
    shortcuts: {
      title: "Browse every shortcut",
      body: "Press ? from the calendar to open the shortcut legend. Search it anytime you forget a key.",
      shortcutHint: "?",
    },
    done: {
      title: "You are ready",
      body: "You can do anything with the keyboard. Try Shift Shift to practice; clicks stay off until you exit. Sample events are already on your calendar. Reopen this tour from the command palette anytime.",
      shortcutHint: "Shift Shift",
    },
  };

  return STEP_IDS.map((id) => ({ id, ...content[id] }));
}

export function getNextOnboardingStepId(
  current: OnboardingTourStepId,
): OnboardingTourStepId | null {
  const index = ONBOARDING_TOUR_STEP_IDS.indexOf(current);
  if (index < 0 || index >= ONBOARDING_TOUR_STEP_IDS.length - 1) return null;
  return ONBOARDING_TOUR_STEP_IDS[index + 1] ?? null;
}
