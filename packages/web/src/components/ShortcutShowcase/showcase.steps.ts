import { KEYMAP } from "@web/shortcuts/keymap";
import { type ShortcutTipPart } from "@web/shortcuts/tips/shortcut-tips.data";

/**
 * Single source of truth for showcase step order.
 *
 * Levels teach the core keyboard patterns on a sandbox calendar, then
 * graduation hands off to a prompt on the real calendar. Skip is always
 * offered: the practice is a game, not a gate.
 *
 * "intro" and "notifications" ride in this list to get the step plumbing, but
 * they are not levels: intro is the intentional start gate, and notifications
 * asks for a browser permission rather than teaching a key. Both stay out of
 * SHOWCASE_LEVEL_IDS and render no "Level N/M" chip.
 */
export type ShowcaseStep = {
  id: string;
  title: string;
  /**
   * Plain copy, or the same parts model as shortcut tips so a step can put
   * real keycap chips in the sentence.
   */
  body: string | readonly ShortcutTipPart[];
  /** One keycap per entry, rendered via ShortcutKeys. */
  keycaps?: readonly string[];
  level?: number;
};

export const SHOWCASE_STEPS = [
  {
    id: "intro",
    title: "Compass is keyboard-only",
    body: "No clicks — just shortcuts. That takes a little practice to get the muscle memory down. This sandbox is that practice, and nothing here is saved.",
  },
  {
    id: "create",
    title: "Drop an event on the board",
    body: "Press C to start a new event.",
    keycaps: KEYMAP.createEvent.keycaps,
    level: 1,
  },
  {
    id: "pageJump",
    title: "See where to go: reveal the jump keys",
    body: [
      "Hold ",
      { key: KEYMAP.jumpPageTarget.holdModifier },
      " to see jump keys, then press 1 or 2.",
    ],
    keycaps: ["Mod", "1-2"],
    level: 2,
  },
  {
    id: "eventJump",
    title: "Pick a target",
    body: [
      "Tap ",
      { key: KEYMAP.eventJump.keycaps[0] },
      " to show event keys, then press a letter to land on one.",
    ],
    keycaps: KEYMAP.eventJump.keycaps,
    level: 3,
  },
  {
    id: "nudge",
    title: "Nudge it into place",
    body: [
      "Hold ",
      { key: "Shift" },
      " and press an arrow to move the focused event.",
    ],
    keycaps: KEYMAP.moveEvent.keycaps,
    level: 4,
  },
  {
    id: "editTitle",
    title: "Grab the title",
    body: [
      "With an event focused, press ",
      { key: "E" },
      " then ",
      { key: "T" },
      " to target the title.",
    ],
    keycaps: KEYMAP.editTitle.keycaps,
    level: 5,
  },
  {
    id: "palette",
    title: "When you forget, ask the palette",
    body: [
      "Press ",
      { keys: KEYMAP.commandPalette.keycaps },
      " to open the command palette. Enter runs the highlighted command.",
    ],
    keycaps: KEYMAP.commandPalette.keycaps,
    level: 6,
  },
  {
    id: "notifications",
    title: "Never miss a meeting",
    body: "Compass can nudge you five minutes before a timed event starts, even when this tab is in the background. You can turn it off any time from the command palette.",
  },
  {
    id: "graduation",
    title: "That's the practice — you've got this.",
    body: [
      "You're done practicing. Those keys work the same on your real calendar. Whenever you wonder where to go, hold ",
      { key: KEYMAP.jumpPageTarget.holdModifier },
      " to see where you can jump.",
    ],
  },
] as const satisfies readonly ShowcaseStep[];

export type ShowcaseStepId = (typeof SHOWCASE_STEPS)[number]["id"];

export const SHOWCASE_STEP_IDS = SHOWCASE_STEPS.map((step) => step.id);

export const SHOWCASE_LEVEL_IDS = SHOWCASE_STEPS.filter(
  (step) => "level" in step,
).map((step) => step.id);

export function getShowcaseStep(id: ShowcaseStepId): ShowcaseStep {
  return SHOWCASE_STEPS.find((step) => step.id === id) ?? SHOWCASE_STEPS[0];
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
