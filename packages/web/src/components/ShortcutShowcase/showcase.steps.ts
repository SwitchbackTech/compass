import { KEYMAP } from "@web/shortcuts/keymap";
import { type ShortcutTipPart } from "@web/shortcuts/tips/shortcut-tips.data";

/**
 * Single source of truth for showcase step order.
 *
 * Two lessons, deliberately. The ten-lesson version lost 40% of the people who
 * cleared step one before graduation (113 -> 68 over 30 days) while the
 * checklist re-taught jump, move, stretch, place and undo on real events
 * anyway. What is left is the one loop nothing else covers and nothing else
 * can: put an event on the calendar without touching the mouse. The practice
 * arena implements only these lessons; the checklist teaches the rest on real
 * events. "graduation" is the exit, not a lesson.
 */
const STEP_IDS = ["create", "save", "graduation"] as const;

export type ShowcaseStepId = (typeof STEP_IDS)[number];

export const SHOWCASE_STEP_IDS: readonly ShowcaseStepId[] = STEP_IDS;

export type ShowcaseStep = {
  id: ShowcaseStepId;
  title: string;
  /**
   * Plain copy, or the same parts model as shortcut tips so a step can put
   * real keycap chips in the sentence.
   */
  body: string | readonly ShortcutTipPart[];
  /** One keycap per entry, rendered via ShortcutKeys. */
  keycaps?: readonly string[];
};

// Keycaps reference KEYMAP so a remap updates the hints automatically.
const STEP_CONTENT: Record<ShowcaseStepId, Omit<ShowcaseStep, "id">> = {
  create: {
    title: "Create with the keyboard",
    body: "Press C to start a new event.",
    keycaps: KEYMAP.createEvent.keycaps,
  },
  save: {
    title: "Name it and save",
    body: "Type a title, then press Enter to save.",
    keycaps: KEYMAP.saveDraft.keycaps,
  },
  graduation: {
    title: "You've shown great control, young cap'n.",
    body: "Now you're ready to steer the real vessel. Sample events are waiting on your calendar, and the checklist there picks up where this left off.",
  },
};

export function getShowcaseStep(id: ShowcaseStepId): ShowcaseStep {
  return { id, ...STEP_CONTENT[id] };
}
