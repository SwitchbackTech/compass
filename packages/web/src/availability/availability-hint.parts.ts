import { type ShortcutTipPart } from "@web/shortcuts/tips/shortcut-tips.data";

/**
 * Exported so tests can assert the rendered sentence without duplicating the
 * copy, the way SidebarStatusBar.test.tsx imports KEYBOARD_PLACE_HINT_PARTS.
 * `ShortcutTipParts` renders the keys as `c-keycap` chips and reconstitutes a
 * plain sentence as the accessible name, so `Z` reads as a key and not as a
 * stray letter in prose.
 *
 * Split across three short lines rather than one sentence: the sidebar is
 * narrow enough that a single line wraps and orphans the last word.
 */
export const AVAILABILITY_MOVE_HINT_PARTS: readonly ShortcutTipPart[] = [
  { keys: ["ArrowUp", "ArrowDown"] },
  " move · ",
  { keys: ["ArrowLeft", "ArrowRight"] },
  " change day",
];

export const AVAILABILITY_ACCEPT_HINT_PARTS: readonly ShortcutTipPart[] = [
  { key: "Enter" },
  " accept · ",
  { key: "Tab" },
  " next time",
];

export const AVAILABILITY_COUNT_HINT_PARTS: readonly ShortcutTipPart[] = [
  { key: "A" },
  " add a time · ",
  { key: "Backspace" },
  " remove",
];
