import { KEYMAP } from "@web/shortcuts/keymap";

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
  body: string;
  /** One keycap per entry, rendered via ShortcutKeys. */
  keycaps?: readonly string[];
};

/**
 * Keycaps reference KEYMAP so a remap updates the hints automatically;
 * keymap.test.ts pins the 1:1 cases. Direction-specific arrows in combined
 * hints stay literal because they demonstrate one direction of a family.
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
    body: "Tap S to flash a key over every event, then press one to jump straight to it.",
    keycaps: KEYMAP.eventJump.keycaps,
  },
  moveEvent: {
    title: "Reschedule in a keystroke",
    body: "Hold Shift and press an arrow key to slide the focused event to a new time or day.",
    keycaps: KEYMAP.moveEvent.keycaps,
  },
  resizeEdge: {
    title: "Stretch the end time",
    body: "Press Tab to focus the event's end time, then hold Shift and press an arrow to stretch it. The start stays put.",
    keycaps: [...KEYMAP.edgeFocus.keycaps, "Shift", "ArrowDown"],
  },
  placeDraft: {
    title: "Place a block anywhere",
    body: "With nothing focused, hold Shift and press an arrow key to drop a new block right on the grid.",
    keycaps: KEYMAP.moveEvent.keycaps,
  },
  undoRedo: {
    title: "Never stress a mistake",
    body: "Press Mod+Z to undo your last change, then Mod+Shift+Z to bring it back.",
    keycaps: KEYMAP.undo.keycaps,
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

export function getShowcaseSteps(): ShowcaseStep[] {
  return STEP_IDS.map((id) => ({ id, ...STEP_CONTENT[id] }));
}

export function getShowcaseStep(id: ShowcaseStepId): ShowcaseStep {
  return { id, ...STEP_CONTENT[id] };
}
