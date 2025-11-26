import { GLOBAL_SHORTCUT_KEYS } from "../../../common/types/global.shortcut.types";

export const NOW_VIEW_SHORTCUT_KEYS = {
  ...GLOBAL_SHORTCUT_KEYS,
  j: "j",
  k: "k",
  r: "r",
  d: "d",
  Enter: "enter",
  Escape: "escape",
} as const;

// Infer Now view shortcut key type from constant
export type NowViewShortcutKey =
  (typeof NOW_VIEW_SHORTCUT_KEYS)[keyof typeof NOW_VIEW_SHORTCUT_KEYS];
