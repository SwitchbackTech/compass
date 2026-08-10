import { getModifierKeyLabel } from "@web/shortcuts/shortcut.util";

/**
 * Single source of truth for step order. "fork" is not a lesson: it's the
 * exit ramp between the basics (required-feeling) and advanced (extra
 * credit) segments — see OnboardingTour.tsx for its two-button UI.
 */
const STEP_IDS = [
  "create",
  "save",
  "moveFocus",
  "editSequence",
  "palette",
  "shortcuts",
  "fork",
  "targetEvent",
  "nudge",
  "undo",
  "done",
] as const;

export type OnboardingTourStepId = (typeof STEP_IDS)[number];

export const ONBOARDING_TOUR_STEP_IDS: OnboardingTourStepId[] = [...STEP_IDS];

/** Steps at or before "fork" count as the required-feeling basics segment. */
export const ONBOARDING_BASICS_STEP_IDS: OnboardingTourStepId[] =
  ONBOARDING_TOUR_STEP_IDS.slice(
    0,
    ONBOARDING_TOUR_STEP_IDS.indexOf("fork") + 1,
  );

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
    moveFocus: {
      title: "Move between events",
      body: "Press an arrow key to move focus from event to event without touching the mouse.",
      shortcutHint: "Arrow keys",
    },
    editSequence: {
      title: "Jump straight to a field",
      body: "Press E, then T, to jump straight into an event's title. Every field has its own letter.",
      shortcutHint: "E then T",
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
    fork: {
      title: "That's the basics",
      body: "You know enough to fly. Want a few extra-credit moves for rescheduling fast, or are you good for now?",
    },
    targetEvent: {
      title: "Jump to any event",
      body: "Tap Shift once to flash a key over every visible event, then press it to jump straight there. Great when there are a few on the same day.",
      shortcutHint: "Shift",
    },
    nudge: {
      title: "Nudge into the perfect slot",
      body: "With an event focused, hold Shift and press an arrow key to slide it a few minutes at a time.",
      shortcutHint: "Shift + Arrow",
    },
    undo: {
      title: "Never stress about a mistake",
      body: `Made a change you didn't mean? Press ${mod}+Z to undo it, ${mod}+Shift+Z to redo.`,
      shortcutHint: `${mod}+Z`,
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
