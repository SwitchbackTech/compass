import { SHORTCUT_KEYS } from "../data/today.shortcuts";

export type Shortcut = { k: string; label: string };

// Extract the union type of all shortcut keys
export type ShortcutKey = (typeof SHORTCUT_KEYS)[keyof typeof SHORTCUT_KEYS];
