import { KEYMAP } from "@web/shortcuts/keymap";
import { type ShortcutTipPart } from "@web/shortcuts/tips/shortcut-tips.data";

/**
 * Single source of truth for showcase step order.
 *
 * One lesson, deliberately. The ten-lesson version lost 40% of the people who
 * cleared step one before graduation (113 -> 68 over 30 days); cutting it to
 * two lessons (create, then save) still left the highest drop-off of any step
 * on the artificial boundary between "press C" and "type a title" - one
 * continuous motion taught as two. What is left is that one loop, taught as
 * one lesson with a hint that advances as the user acts (see
 * getCreateLessonPhase): put an event on the calendar without touching the
 * mouse. Graduation now hands off to a prompt on the real calendar, not a
 * checklist that re-teaches jump, move, stretch, place and undo on sample
 * events - "graduation" is the exit, not a lesson.
 *
 * "notifications" is the one deliberate exception to the one-lesson rule, and
 * it is not a lesson: it is a single-keystroke offer (Enter to allow, N to
 * pass) that has to sit here because a browser permission prompt only counts
 * as a real choice while the user is deciding how Compass fits their day.
 * Nothing is taught and nothing is gated - it adds no drop-off surface of the
 * kind that cost the ten-lesson version its users.
 */
const STEP_IDS = ["create", "notifications", "graduation"] as const;

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
    title: "Create an event",
    body: "Press C to start a new event.",
    keycaps: KEYMAP.createEvent.keycaps,
  },
  notifications: {
    title: "Never miss a meeting",
    body: "Compass can nudge you five minutes before a timed event starts, even when this tab is in the background. You can turn it off any time from the command palette.",
  },
  graduation: {
    title: "You've shown great control, young cap'n.",
    // Seeds the one habit that reveals the rest: holding Mod shows jump keys
    // wherever you are (form fields, page areas), so graduation teaches the
    // gesture instead of a checklist of shortcuts.
    body: [
      "That was practice. Your real calendar is next — the same two keys put a real event on it. And whenever you wonder where to go, hold ",
      { key: KEYMAP.jumpPageTarget.holdModifier },
      " to see where you can jump.",
    ],
  },
};

export function getShowcaseStep(id: ShowcaseStepId): ShowcaseStep {
  return { id, ...STEP_CONTENT[id] };
}

/**
 * The "create" lesson is one continuous motion (C, then type, then Enter)
 * taught as a single step: the body and keycap hint swap the moment the
 * practice editor opens, rather than gating a second lesson behind it.
 */
export function getCreateLessonPhase(
  hasOpenEditor: boolean,
): Partial<Pick<ShowcaseStep, "body" | "keycaps">> {
  if (!hasOpenEditor) return {};
  return {
    body: "Type a title, then press Enter to save.",
    keycaps: KEYMAP.saveDraft.keycaps,
  };
}
