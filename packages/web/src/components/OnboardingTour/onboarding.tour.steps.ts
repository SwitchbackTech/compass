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

export const ONBOARDING_TOUR_STEP_IDS: readonly OnboardingTourStepId[] =
  STEP_IDS;

export type OnboardingTourStep = {
  id: OnboardingTourStepId;
  title: string;
  body: string;
  /**
   * Keycap hint under the body. A string is one key; an array is one keycap
   * per entry (separate strokes or chords), rendered via ShortcutKeys.
   */
  shortcutHint?: string | string[];
};

export function getOnboardingTourSteps(): OnboardingTourStep[] {
  const content: Record<
    OnboardingTourStepId,
    Omit<OnboardingTourStep, "id">
  > = {
    create: {
      title: "Create with the keyboard",
      body: "Press C to start a timed event.",
      shortcutHint: "C",
    },
    save: {
      title: "Name it and save",
      body: "Type a title, then press Enter to save.",
      shortcutHint: "Enter",
    },
    moveFocus: {
      title: "Move between events",
      body: "Press an arrow key to move focus from event to event without touching the mouse.",
      shortcutHint: ["ArrowLeft", "ArrowUp", "ArrowDown", "ArrowRight"],
    },
    editSequence: {
      title: "Jump straight to a field",
      body: "Press E, then T, to open the practice event and jump straight into its title. Every field has its own letter.",
      shortcutHint: ["E", "T"],
    },
    palette: {
      title: "Open the command palette",
      body: "Open the command palette for commands. Browse or search, then close with Escape.",
      shortcutHint: ["Mod", "K"],
    },
    shortcuts: {
      title: "Browse every shortcut",
      body: "Press ? from the calendar to open the shortcut legend. Search it anytime you forget a key.",
      shortcutHint: "?",
    },
    fork: {
      title: "That's the basics",
      body: "A few extra-credit moves for rescheduling fast are next. Skip anytime if you want.",
    },
    targetEvent: {
      title: "Jump to any event",
      body: "Tap Shift once to flash a key over every visible event, then press it to jump straight there. Great when there are a few on the same day.",
      shortcutHint: "Shift",
    },
    nudge: {
      title: "Nudge into the perfect slot",
      body: "With an event focused, hold Shift and press an arrow key to slide it a few minutes at a time.",
      shortcutHint: ["Shift", "ArrowRight"],
    },
    undo: {
      title: "Never stress about a mistake",
      body: "Made a change you didn't mean? Undo it, or add Shift to redo.",
      shortcutHint: ["Mod", "Z"],
    },
    done: {
      title: "You are ready",
      body: "You can do anything with the keyboard. Try Shift Shift to enter Hardcore Mode; clicks stay off until you exit. Sample events are already on your calendar. Reopen this tour from the command palette anytime.",
      shortcutHint: ["Shift", "Shift"],
    },
  };

  return STEP_IDS.map((id) => ({ id, ...content[id] }));
}

export function getNextOnboardingStepId(
  current: OnboardingTourStepId,
): OnboardingTourStepId | null {
  const index = STEP_IDS.indexOf(current);
  if (index < 0) return null;
  return STEP_IDS[index + 1] ?? null;
}

export function getPreviousOnboardingStepId(
  current: OnboardingTourStepId,
): OnboardingTourStepId | null {
  const index = STEP_IDS.indexOf(current);
  if (index <= 0) return null;
  return STEP_IDS[index - 1] ?? null;
}

/** Steps where arrow keys teach a lesson, so tour Previous/Next arrows stand down. */
export const ONBOARDING_ARROW_LESSON_STEP_IDS: ReadonlySet<OnboardingTourStepId> =
  new Set(["moveFocus", "nudge"]);
