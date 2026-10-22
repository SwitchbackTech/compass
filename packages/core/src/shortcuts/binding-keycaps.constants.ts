/**
 * Month-picker month jump: J/K match grid period nav (J back, K forward).
 * Mod+Alt+Shift keeps the chord out of text fields without bare letters and
 * avoids browser-reserved combos: Mod+Alt+J/K (DevTools / web console on Mac),
 * Mod+Shift+J (Downloads / DevTools), Ctrl+Shift+J (DevTools on Windows/Linux).
 */
export const MONTH_PICKER_PREV_HOTKEY = "Mod+Alt+Shift+J" as const;
export const MONTH_PICKER_NEXT_HOTKEY = "Mod+Alt+Shift+K" as const;

export const MONTH_PICKER_PREV_KEYCAPS = ["Mod", "Alt", "Shift", "j"] as const;
export const MONTH_PICKER_NEXT_KEYCAPS = ["Mod", "Alt", "Shift", "k"] as const;

export const EVENT_MENU_LETTER = "m";
export const HIDE_EVENT_LETTER = "x";
export const FOCUS_NOTICE_LETTER = "p";

export const VIEW_SHORTCUT_KEYS = {
  day: "d",
  week: "w",
  life: "l",
} as const;
