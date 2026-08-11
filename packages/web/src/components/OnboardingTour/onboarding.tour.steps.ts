/**
 * Single source of truth for step order. "fork" is not a lesson: it's the
 * exit ramp between Act 1 (basics, required-feeling) and Act 2 (extra
 * credit) — see OnboardingTour.tsx for its two-button UI. Act 3 is a single
 * graduation step ("hardcore").
 */
const STEP_IDS = [
  "create",
  "save",
  "moveFocus",
  "editSequence",
  "fork",
  "targetEvent",
  "move",
  "resizeEdge",
  "placeDraft",
  "undo",
  "hardcore",
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
      body: "Press an arrow key to move focus onto a different event, without touching the mouse.",
      shortcutHint: ["ArrowLeft", "ArrowUp", "ArrowDown", "ArrowRight"],
    },
    editSequence: {
      title: "Jump straight to a field",
      body: "Press E, then T, to open the focused event and jump straight into its title. Every field has its own letter.",
      shortcutHint: ["E", "T"],
    },
    fork: {
      title: "That's the basics",
      body: "A few extra-credit moves for rescheduling fast are next. Skip anytime if you want.",
    },
    targetEvent: {
      title: "Jump to Dentist",
      body: "Tap S to flash a key over every visible event, then press Dentist's key to jump straight to it. Great when there are a few on the same day.",
      shortcutHint: "S",
    },
    move: {
      title: "Move Dentist out of the overlap",
      body: "Dentist overlaps Team sync tomorrow. With Dentist focused, hold Shift and press an arrow key to slide it clear.",
      shortcutHint: ["Shift", "ArrowRight"],
    },
    resizeEdge: {
      title: "Give Dentist more time",
      body: "Press Tab to focus just Dentist's end time, then hold Shift and press an arrow key to stretch it. The start time stays put.",
      shortcutHint: ["Tab", "Shift", "ArrowDown"],
    },
    placeDraft: {
      title: "Place a new event on the grid",
      body: "With nothing focused, hold Shift and press an arrow key to drop a draft on the grid at that time.",
      shortcutHint: ["Shift", "ArrowRight"],
    },
    undo: {
      title: "Never stress about a mistake",
      body: "Undo your changes to Dentist with Mod+Z, then bring them back with Mod+Shift+Z.",
      shortcutHint: ["Mod", "Z"],
    },
    hardcore: {
      title: "Graduate to Hardcore Mode",
      body: "Press H to go keyboard-only, clicks stay off until you exit. Sample events are already on your calendar. Reopen this tour from the command palette anytime.",
      shortcutHint: "H",
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
  new Set(["moveFocus", "move", "resizeEdge", "placeDraft"]);
