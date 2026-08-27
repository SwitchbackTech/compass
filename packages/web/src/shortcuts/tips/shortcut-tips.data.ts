import { KEYMAP } from "@web/shortcuts/keymap";
import { expandModInShortcutDisplay } from "@web/shortcuts/shortcut.util";

export type ShortcutHintId =
  | "first-event-save"
  | "save-draft"
  | "life-this-week"
  | "edit-sequence"
  | "nudge"
  | "create-event"
  | "page-jump"
  | "event-jump"
  | "command-palette";

export type ShortcutTipPart =
  | string
  | { key: string }
  | { keys: readonly string[] };

export type ShortcutHint = {
  id: ShortcutHintId;
  parts: ShortcutTipPart[];
};

const spokenKey = (token: string): string => {
  const expanded = expandModInShortcutDisplay(token);
  if (expanded === "Meta") return "Cmd";
  if (expanded === "Control") return "Ctrl";
  return expanded;
};

const partPlainText = (part: ShortcutTipPart): string => {
  if (typeof part === "string") return part;
  const keys = "keys" in part ? part.keys : [part.key];
  return keys.map(spokenKey).join("+");
};

export const getPartsPlainText = (parts: readonly ShortcutTipPart[]): string =>
  parts.map(partPlainText).join("");

export const getHintPlainText = (hint: ShortcutHint): string =>
  getPartsPlainText(hint.parts);

const [createKey] = KEYMAP.createEvent.keycaps;
const [saveKey] = KEYMAP.saveDraft.keycaps;
const [editLeader, editSecond] = KEYMAP.editTitle.keycaps;
const [eventJumpKey] = KEYMAP.eventJump.keycaps;
const [nudgeModifier] = KEYMAP.moveEvent.keycaps;

export const SHORTCUT_HINTS: Record<ShortcutHintId, ShortcutHint> = {
  "first-event-save": {
    id: "first-event-save",
    parts: ["Type a title, then ", { key: saveKey }],
  },
  "save-draft": {
    id: "save-draft",
    parts: [
      { key: saveKey },
      " to save · hold ",
      { key: KEYMAP.jumpFormField.holdModifier },
      " to jump fields",
    ],
  },
  "life-this-week": {
    id: "life-this-week",
    parts: ["Press ", { key: "T" }, " to jump to this week"],
  },
  "edit-sequence": {
    id: "edit-sequence",
    parts: [
      "Press ",
      { key: editLeader },
      " then ",
      { key: editSecond },
      " to jump to the title",
    ],
  },
  "create-event": {
    id: "create-event",
    parts: ["Press ", { key: createKey }, " to add an event"],
  },
  "page-jump": {
    id: "page-jump",
    parts: [
      "Hold ",
      { key: KEYMAP.jumpPageTarget.holdModifier },
      " to see where you can jump",
    ],
  },
  "event-jump": {
    id: "event-jump",
    parts: ["Press ", { key: eventJumpKey }, " to show event keys"],
  },
  nudge: {
    id: "nudge",
    parts: ["Hold ", { key: nudgeModifier }, " and press an arrow to move"],
  },
  "command-palette": {
    id: "command-palette",
    parts: [
      "Press ",
      { keys: KEYMAP.commandPalette.keycaps },
      " to open the command palette",
    ],
  },
};

export function getShortcutHint(id: ShortcutHintId): ShortcutHint {
  return SHORTCUT_HINTS[id];
}

export function isShortcutHintId(value: string): value is ShortcutHintId {
  return Object.hasOwn(SHORTCUT_HINTS, value);
}
