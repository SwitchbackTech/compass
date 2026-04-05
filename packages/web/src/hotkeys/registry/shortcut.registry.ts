import { type RegisterableHotkey } from "@tanstack/react-hotkeys";

export const ShortcutTags = {
  GLOBAL: "global",
  DAY: "day",
  WEEK: "week",
  NOW: "now",
} as const;

export type ShortcutTag = (typeof ShortcutTags)[keyof typeof ShortcutTags];

export interface ShortcutDef {
  /** Key passed to useAppHotkey / useAppHotkeyUp — typed as RegisterableHotkey for zero-cast call sites. */
  hotkey: RegisterableHotkey;
  /** Display string for ShortCutLabel / tooltips (e.g. "j", "Mod+k", "e d"). */
  display: string;
  /** Human-readable label shown in the shortcut overlay. */
  label: string;
  /** Used to filter which shortcuts appear in each view's display list. */
  tags: ShortcutTag[];
  /** For sequence shortcuts — the array passed to useHotkeySequence (e.g. ["E", "D"]). */
  sequence?: string[];
}

const { GLOBAL, DAY, WEEK, NOW } = ShortcutTags;

export const SHORTCUTS = {
  // ── Global ──────────────────────────────────────────────────────────────────
  NAV_NOW: { hotkey: "N", display: "n", label: "Now", tags: [GLOBAL] },
  NAV_DAY: { hotkey: "D", display: "d", label: "Day", tags: [GLOBAL] },
  NAV_WEEK: { hotkey: "W", display: "w", label: "Week", tags: [GLOBAL] },
  NAV_REMINDER: {
    hotkey: "R",
    display: "r",
    label: "Edit reminder",
    tags: [GLOBAL],
  },
  NAV_LOGOUT: { hotkey: "Z", display: "z", label: "Logout", tags: [GLOBAL] },
  CMD_PALETTE: {
    hotkey: "Mod+K",
    display: "Mod+k",
    label: "Command Palette",
    tags: [GLOBAL],
  },

  // ── Shared navigation (same key, different meaning per view) ─────────────────
  // Labels are overridden in getShortcuts() to be view-specific.
  NAV_PREV: {
    hotkey: "J",
    display: "j",
    label: "Previous",
    tags: [DAY, WEEK, NOW],
  },
  NAV_NEXT: {
    hotkey: "K",
    display: "k",
    label: "Next",
    tags: [DAY, WEEK, NOW],
  },
  NAV_TODAY: {
    hotkey: "T",
    display: "t",
    label: "Go to today",
    tags: [DAY, WEEK],
  },
  TOGGLE_SIDEBAR: {
    hotkey: "[",
    display: "[",
    label: "Toggle sidebar",
    tags: [DAY, WEEK, NOW],
  },

  // ── Day view ─────────────────────────────────────────────────────────────────
  DAY_FOCUS_TASKS: {
    hotkey: "U",
    display: "u",
    label: "Focus on tasks",
    tags: [DAY],
  },
  DAY_CREATE_TASK: {
    hotkey: "C",
    display: "c",
    label: "Create task",
    tags: [DAY],
  },
  DAY_EDIT_TASK: {
    hotkey: "E",
    display: "e",
    label: "Edit task",
    tags: [DAY],
  },
  DAY_FOCUS_AGENDA: {
    hotkey: "I",
    display: "i",
    label: "Focus on calendar",
    tags: [DAY],
  },
  DAY_EDIT_EVENT: {
    hotkey: "M",
    display: "m",
    label: "Edit event",
    tags: [DAY],
  },
  DAY_UNDO: { hotkey: "Mod+Z", display: "Mod+z", label: "Undo", tags: [DAY] },
  DAY_MIGRATE_FWD: {
    hotkey: "Control+Meta+ArrowRight",
    display: "Control+Meta+ArrowRight",
    label: "Migrate task forward",
    tags: [DAY],
  },
  DAY_MIGRATE_BACK: {
    hotkey: "Control+Meta+ArrowLeft",
    display: "Control+Meta+ArrowLeft",
    label: "Migrate task backward",
    tags: [DAY],
  },

  // ── Week view ────────────────────────────────────────────────────────────────
  WEEK_OPEN_TASKS: {
    hotkey: "Shift+1",
    display: "Shift+1",
    label: "Open tasks",
    tags: [WEEK],
  },
  WEEK_OPEN_MONTH: {
    hotkey: "Shift+2",
    display: "Shift+2",
    label: "Open month view",
    tags: [WEEK],
  },
  WEEK_CREATE_ALLDAY: {
    hotkey: "A",
    display: "a",
    label: "Create all-day event",
    tags: [WEEK],
  },
  WEEK_CREATE_TIMED: {
    hotkey: "C",
    display: "c",
    label: "Create event",
    tags: [WEEK],
  },
  WEEK_SOMEDAY_MONTH: {
    hotkey: "M",
    display: "m",
    label: "Add someday month",
    tags: [WEEK],
  },
  WEEK_SOMEDAY_WEEK: {
    hotkey: "W",
    display: "w",
    label: "Add someday week",
    tags: [WEEK],
  },

  // ── Now view ─────────────────────────────────────────────────────────────────
  NOW_FOCUS_DESC: {
    hotkey: "D",
    display: "e d",
    label: "Edit description",
    tags: [NOW],
    sequence: ["E", "D"],
  },
  NOW_SAVE_DESC: {
    hotkey: "Mod+Enter",
    display: "Mod+Enter",
    label: "Save description",
    tags: [NOW],
  },
  NOW_COMPLETE_TASK: {
    hotkey: "Enter",
    display: "Enter",
    label: "Mark complete",
    tags: [NOW],
  },
  NOW_ESCAPE: {
    hotkey: "Escape",
    display: "Esc",
    label: "Back to Today",
    tags: [NOW],
  },
} as const satisfies Record<string, ShortcutDef>;
