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
 */
const STEP_IDS = ["create", "graduation"] as const;

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
  graduation: {
    title: "You've shown great control, young cap'n.",
    body: "That was practice. Your real calendar is next — the same two keys put a real event on it.",
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
): Pick<ShowcaseStep, "body" | "keycaps"> {
  if (hasOpenEditor) {
    return {
      body: "Type a title, then press Enter to save.",
      keycaps: KEYMAP.saveDraft.keycaps,
    };
  }
  return {
    body: STEP_CONTENT.create.body,
    keycaps: STEP_CONTENT.create.keycaps,
  };
}
