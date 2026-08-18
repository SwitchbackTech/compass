import { KEYMAP } from "@web/shortcuts/keymap";
import { type ShortcutTipPart } from "@web/shortcuts/tips/shortcut-tips.data";

/**
 * Single source of truth for showcase step order. Every shortcut concept the
 * app teaches lives here; the checklist in the real app only re-practices
 * them. "graduation" is the exit, not a lesson.
 */
const STEP_IDS = [
  "create",
  "save",
  "moveFocus",
  "editTitle",
  "eventJump",
  "moveEvent",
  "resizeEdge",
  "placeDraft",
  "undoRedo",
  "hardcore",
  "graduation",
] as const;

export type ShowcaseStepId = (typeof STEP_IDS)[number];

export const SHOWCASE_STEP_IDS: readonly ShowcaseStepId[] = STEP_IDS;

export type ShowcaseStep = {
  id: ShowcaseStepId;
  title: string;
  /**
   * Plain copy, or the same parts model as shortcut tips so a step can put
   * real keycap chips in the sentence. Only undoRedo needs that; converting
   * every body would duplicate the chip row already rendered from `keycaps`.
   */
  body: string | readonly ShortcutTipPart[];
  /** One keycap per entry, rendered via ShortcutKeys. */
  keycaps?: readonly string[];
};

/**
 * Second half of the resizeEdge lesson, swapped in once the end edge has
 * focus so the row never reads as one three-key press. Stretching reuses the
 * Shift+Arrow family bound by KEYMAP.moveEvent; the arrow stays literal
 * because it demonstrates one direction, and only up/down stretch.
 */
export const STRETCH_KEYCAPS: readonly string[] = ["Shift", "ArrowDown"];

/**
 * Keycaps reference KEYMAP so a remap updates the hints automatically;
 * keymap.test.ts pins the 1:1 cases.
 */
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
  moveFocus: {
    title: "Move between events",
    body: "Press an arrow key to move focus onto a different event, no mouse needed.",
    keycaps: KEYMAP.moveFocus.keycaps,
  },
  editTitle: {
    title: "Jump straight to a field",
    body: "Press E, then T, to open the focused event's title. Every field has its own letter.",
    keycaps: KEYMAP.editTitle.keycaps,
  },
  eventJump: {
    title: "Jump to any event",
    body: "Tap S to flash a key over every event, then type its key to jump straight to it.",
    keycaps: KEYMAP.eventJump.keycaps,
  },
  moveEvent: {
    title: "Reschedule in a keystroke",
    body: "Hold Shift and press an arrow key to slide the focused event to a new time or day.",
    keycaps: KEYMAP.moveEvent.keycaps,
  },
  resizeEdge: {
    // Two phases: the hint swaps to Shift+Arrow once the end edge has focus,
    // so the keycaps here only cover the first press.
    title: "Stretch the end time",
    body: "Press Tab to focus the event's end time, then hold Shift and press the up or down arrow to stretch it. The start stays put.",
    keycaps: KEYMAP.edgeFocus.keycaps,
  },
  placeDraft: {
    title: "Place a block anywhere",
    body: "With nothing focused, hold Shift and press an arrow key to place a new block right on the grid.",
    keycaps: KEYMAP.moveEvent.keycaps,
  },
  undoRedo: {
    title: "Never stress a mistake",
    // Chips live in the sentence so both chords render; a second keycap row
    // would duplicate undo and still hide redo.
    body: [
      "Press ",
      { keys: KEYMAP.undo.keycaps },
      " to undo your last change, then ",
      { keys: KEYMAP.redo.keycaps },
      " to bring it back.",
    ],
  },
  hardcore: {
    title: "Try Hardcore Mode",
    body: "Press H to go keyboard-only. In the real app, clicks stay off until you exit.",
    keycaps: KEYMAP.hardcore.keycaps,
  },
  graduation: {
    title: "You've shown great control, young cap'n.",
    body: "Now you're ready to steer the real vessel. Sample events are waiting on your calendar, and you can replay this practice anytime from the command palette.",
  },
};

export function getShowcaseStep(id: ShowcaseStepId): ShowcaseStep {
  return { id, ...STEP_CONTENT[id] };
}
