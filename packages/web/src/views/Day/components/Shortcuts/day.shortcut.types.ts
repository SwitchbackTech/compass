import { GLOBAL_SHORTCUT_KEYS } from "@web/common/types/global.shortcut.types";

export const DAY_VIEW_SHORTCUT_KEYS = {
  ...GLOBAL_SHORTCUT_KEYS,
  j: "j",
  k: "k",
  t: "t",
  u: "u",
  c: "c",
  e: "e",
  Delete: "Delete",
  Enter: "Enter",
  Escape: "Escape",
  Esc: "Esc",
  i: "i",
} as const;

// Infer Day view shortcut key type from constant
export type DayViewShortcutKey =
  (typeof DAY_VIEW_SHORTCUT_KEYS)[keyof typeof DAY_VIEW_SHORTCUT_KEYS];
