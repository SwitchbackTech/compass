import { KEYMAP } from "@web/shortcuts/keymap";
import { type ShortcutTipPart } from "@web/shortcuts/tips/shortcut-tips.data";

/**
 * Single source of truth for showcase step order.
 *
 * Missions teach the core keyboard patterns on a sandbox calendar, then
 * graduation hands off to a prompt on the real calendar. Skip is always
 * offered: the practice is a game, not a gate.
 *
 * "notifications" rides in this list to get the step plumbing, but it is not
 * a mission: it asks for a browser permission rather than teaching a key, so
 * it stays out of SHOWCASE_MISSION_IDS and renders no "Mission N of M" chip.
 */
const STEP_IDS = [
  "create",
  "pageJump",
  "eventJump",
  "nudge",
  "editTitle",
  "palette",
  "notifications",
  "graduation",
] as const;

export type ShowcaseStepId = (typeof STEP_IDS)[number];

export const SHOWCASE_STEP_IDS: readonly ShowcaseStepId[] = STEP_IDS;

export const SHOWCASE_MISSION_IDS = STEP_IDS.filter(
  (id): id is Exclude<ShowcaseStepId, "graduation" | "notifications"> =>
    id !== "graduation" && id !== "notifications",
);

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

const STEP_CONTENT: Record<ShowcaseStepId, Omit<ShowcaseStep, "id">> = {
  create: {
    title: "Drop an event on the board",
    body: "Press C to start a new event.",
    keycaps: KEYMAP.createEvent.keycaps,
  },
  pageJump: {
    title: "Hold fast — reveal the jump keys",
    body: [
      "Hold ",
      { key: KEYMAP.jumpPageTarget.holdModifier },
      " to see jump keys, then press 1 or 2.",
    ],
    keycaps: ["Mod", "1-2"],
  },
  eventJump: {
    title: "Pick a target",
    body: [
      "Tap ",
      { key: "S" },
      " to show event keys, then press a letter to land on one.",
    ],
    keycaps: KEYMAP.eventJump.keycaps,
  },
  nudge: {
    title: "Nudge it into place",
    body: [
      "Hold ",
      { key: "Shift" },
      " and press an arrow to move the focused event.",
    ],
    keycaps: KEYMAP.moveEvent.keycaps,
  },
  editTitle: {
    title: "Grab the title",
    body: [
      "With an event focused, press ",
      { key: "E" },
      " then ",
      { key: "T" },
      " to target the title.",
    ],
    keycaps: KEYMAP.editTitle.keycaps,
  },
  palette: {
    title: "When you forget, ask the palette",
    body: [
      "Press ",
      { keys: KEYMAP.commandPalette.keycaps },
      " to open the command palette. Enter runs the highlighted command.",
    ],
    keycaps: KEYMAP.commandPalette.keycaps,
  },
  notifications: {
    title: "Never miss a meeting",
    body: "Compass can nudge you five minutes before a timed event starts, even when this tab is in the background. You can turn it off any time from the command palette.",
  },
  graduation: {
    title: "You've shown great control, young cap'n.",
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

export function getMissionLabel(id: ShowcaseStepId): string | null {
  if (id === "graduation" || id === "notifications") return null;
  const number = SHOWCASE_MISSION_IDS.indexOf(id) + 1;
  return `Mission ${number} of ${SHOWCASE_MISSION_IDS.length}`;
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
