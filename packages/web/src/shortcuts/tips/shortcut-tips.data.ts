import { KEYMAP } from "@web/shortcuts/keymap";
import { expandModInShortcutDisplay } from "@web/shortcuts/shortcut.util";

export type ShortcutHintId =
  | "first-event-save"
  | "save-draft"
  | "life-this-week"
  | "edit-sequence"
  | "nudge"
  | "edge-focus"
  | "create-event"
  | "page-jump"
  | "event-jump"
  | "week-day-focus"
  | "command-palette";

export type ShortcutActionId =
  | "calendar.create_timed_event"
  | "calendar.event_jump"
  | "calendar.focus_week_day"
  | "calendar.page_jump"
  | "command_palette.open"
  | "event.edge_focus"
  | "event.edit_title"
  | "event.move"
  | "event_form.progress"
  | "life.focus_current_week";

export type ShortcutFeatureArea =
  | "calendar_navigation"
  | "command_palette"
  | "event_creation"
  | "event_editing"
  | "life_navigation";

export type ShortcutAvailability =
  | "calendar"
  | "event_form"
  | "event_focused"
  | "first_event_form"
  | "global"
  | "life_view"
  | "week_view";

export type ShortcutSuggestionReason =
  | "calendar_idle"
  | "event_form"
  | "event_focused"
  | "first_event"
  | "life_view"
  | "local_discovery"
  | "local_fatigue"
  | "local_recency"
  | "week_view";

export type ShortcutTipPart =
  | string
  | { key: string }
  | { keys: readonly string[] };

export type ShortcutHint = {
  id: ShortcutHintId;
  actionId: ShortcutActionId;
  availability: ShortcutAvailability;
  featureArea: ShortcutFeatureArea;
  keybinding: readonly string[];
  label: string;
  parts: readonly ShortcutTipPart[];
  suggestionReason: ShortcutSuggestionReason;
};

export type RankedShortcutHint = ShortcutHint & {
  rank: number;
  reasonCode: ShortcutSuggestionReason;
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
    actionId: "event_form.progress",
    availability: "first_event_form",
    featureArea: "event_creation",
    keybinding: [saveKey],
    label: "Save the first event",
    parts: ["Type a title, then ", { key: saveKey }],
    suggestionReason: "first_event",
  },
  "save-draft": {
    id: "save-draft",
    actionId: "event_form.progress",
    availability: "event_form",
    featureArea: "event_editing",
    keybinding: [saveKey, ...KEYMAP.jumpFormField.keycaps],
    label: "Save or navigate the event form",
    parts: [
      { key: saveKey },
      " to save · hold ",
      { key: KEYMAP.jumpFormField.holdModifier },
      " to jump fields",
    ],
    suggestionReason: "event_form",
  },
  "life-this-week": {
    id: "life-this-week",
    actionId: "life.focus_current_week",
    availability: "life_view",
    featureArea: "life_navigation",
    keybinding: ["T"],
    label: "Focus the current week",
    parts: ["Press ", { key: "T" }, " to jump to this week"],
    suggestionReason: "life_view",
  },
  "edit-sequence": {
    id: "edit-sequence",
    actionId: "event.edit_title",
    availability: "event_focused",
    featureArea: "event_editing",
    keybinding: [editLeader, editSecond],
    label: "Edit the focused event title",
    parts: [
      "Press ",
      { key: editLeader },
      " then ",
      { key: editSecond },
      " to jump to the title",
    ],
    suggestionReason: "event_focused",
  },
  "create-event": {
    id: "create-event",
    actionId: "calendar.create_timed_event",
    availability: "calendar",
    featureArea: "event_creation",
    keybinding: [createKey],
    label: "Create a timed event",
    parts: ["Press ", { key: createKey }, " to add an event"],
    suggestionReason: "calendar_idle",
  },
  "page-jump": {
    id: "page-jump",
    actionId: "calendar.page_jump",
    availability: "calendar",
    featureArea: "calendar_navigation",
    keybinding: [...KEYMAP.jumpPageTarget.keycaps],
    label: "Jump to a page area",
    parts: [
      "Hold ",
      { key: KEYMAP.jumpPageTarget.holdModifier },
      " to see where you can jump",
    ],
    suggestionReason: "calendar_idle",
  },
  "event-jump": {
    id: "event-jump",
    actionId: "calendar.event_jump",
    availability: "calendar",
    featureArea: "calendar_navigation",
    keybinding: [eventJumpKey],
    label: "Show event jump keys",
    parts: [
      "Press ",
      { key: eventJumpKey },
      " to show event keys, or a day key to jump",
    ],
    suggestionReason: "calendar_idle",
  },
  "week-day-focus": {
    id: "week-day-focus",
    actionId: "calendar.focus_week_day",
    availability: "week_view",
    featureArea: "calendar_navigation",
    keybinding: [eventJumpKey, "M"],
    label: "Focus a week column",
    parts: [
      "On week view, press ",
      { key: eventJumpKey },
      " then ",
      { key: "M" },
      " to focus Monday",
    ],
    suggestionReason: "week_view",
  },
  nudge: {
    id: "nudge",
    actionId: "event.move",
    availability: "event_focused",
    featureArea: "event_editing",
    keybinding: [...KEYMAP.moveEvent.keycaps],
    label: "Move the focused event",
    parts: ["Hold ", { key: nudgeModifier }, " and press an arrow to move"],
    suggestionReason: "event_focused",
  },
  "edge-focus": {
    id: "edge-focus",
    actionId: "event.edge_focus",
    availability: "event_focused",
    featureArea: "event_editing",
    keybinding: [...KEYMAP.edgeFocus.keycaps],
    label: "Choose an event edge",
    parts: [
      "Press ",
      { key: KEYMAP.edgeFocus.hotkey },
      " to the start or end, then hold ",
      { key: nudgeModifier },
      " and press an arrow",
    ],
    suggestionReason: "event_focused",
  },
  "command-palette": {
    id: "command-palette",
    actionId: "command_palette.open",
    availability: "global",
    featureArea: "command_palette",
    keybinding: [...KEYMAP.commandPalette.keycaps],
    label: "Open the command palette",
    parts: [
      "Press ",
      { keys: KEYMAP.commandPalette.keycaps },
      " to open the command palette",
    ],
    suggestionReason: "calendar_idle",
  },
};

export function getShortcutHint(id: ShortcutHintId): ShortcutHint {
  return SHORTCUT_HINTS[id];
}

export function isShortcutHintId(value: string): value is ShortcutHintId {
  return Object.hasOwn(SHORTCUT_HINTS, value);
}
