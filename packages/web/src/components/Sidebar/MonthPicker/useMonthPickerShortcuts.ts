import { useAppShortcut } from "@web/shortcuts/useAppShortcut";

export const MONTH_PICKER_PREV_HOTKEY = "Mod+Shift+J";
export const MONTH_PICKER_NEXT_HOTKEY = "Mod+Shift+K";

export const MONTH_PICKER_PREV_KEYCAPS = ["Mod", "Shift", "J"] as const;
export const MONTH_PICKER_NEXT_KEYCAPS = ["Mod", "Shift", "K"] as const;

/** Remaining keys once Mod is already held (hold-Mod hint chips). */
export const MONTH_PICKER_PREV_HOLD_KEYCAPS = ["Shift", "J"] as const;
export const MONTH_PICKER_NEXT_HOLD_KEYCAPS = ["Shift", "K"] as const;

/**
 * Mod+Shift+J / Mod+Shift+K step the sidebar month picker's displayed month
 * the same way the chevrons do. Registered only while the picker is mounted.
 */
export function useMonthPickerShortcuts({
  onPrevMonth,
  onNextMonth,
}: {
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  useAppShortcut(MONTH_PICKER_PREV_HOTKEY, onPrevMonth, {
    ignoreInputs: true,
  });
  useAppShortcut(MONTH_PICKER_NEXT_HOTKEY, onNextMonth, {
    ignoreInputs: true,
  });
}
