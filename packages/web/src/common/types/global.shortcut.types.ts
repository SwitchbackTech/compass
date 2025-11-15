import { SHORTCUT_KEYS } from "@web/views/Day/components/Shortcuts/data/shortcuts.data";

export type Shortcut = { k: string; label: string };

// Extract the union type of all shortcut keys
export type ShortcutKey = (typeof SHORTCUT_KEYS)[keyof typeof SHORTCUT_KEYS];

// Global shortcuts available in all views
export const GLOBAL_SHORTCUT_KEYS = {
  "1": "1",
  "2": "2",
  "3": "3",
} as const;
