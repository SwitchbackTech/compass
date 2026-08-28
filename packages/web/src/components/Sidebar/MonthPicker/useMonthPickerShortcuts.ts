import { useAppShortcut } from "@web/shortcuts/useAppShortcut";

export const MONTH_PICKER_PREV_HOTKEY = "Mod+Shift+,";
export const MONTH_PICKER_NEXT_HOTKEY = "Mod+Shift+.";

export const MONTH_PICKER_PREV_KEYCAPS = ["Mod", "Shift", ","] as const;
export const MONTH_PICKER_NEXT_KEYCAPS = ["Mod", "Shift", "."] as const;

const MONTH_PICKER_SHORTCUT_OPTIONS = {
  ignoreInputs: true,
  preventDefault: true,
  stopPropagation: true,
} as const;

/**
 * Mod+Shift+, / Mod+Shift+. step the sidebar month picker's displayed month
 * the same way the chevrons do. Registered only while the picker is mounted.
 * Avoids Chrome/Edge's reserved Mod+Shift+J (Downloads / Console).
 *
 * US QWERTY reports Shift+, / Shift+. as `<` / `>`, so those aliases are
 * registered too and match the real KeyboardEvent.
 */
export function useMonthPickerShortcuts({
  onPrevMonth,
  onNextMonth,
}: {
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  useAppShortcut(
    MONTH_PICKER_PREV_HOTKEY,
    onPrevMonth,
    MONTH_PICKER_SHORTCUT_OPTIONS,
  );
  useAppShortcut("Mod+Shift+<", onPrevMonth, MONTH_PICKER_SHORTCUT_OPTIONS);
  useAppShortcut(
    MONTH_PICKER_NEXT_HOTKEY,
    onNextMonth,
    MONTH_PICKER_SHORTCUT_OPTIONS,
  );
  useAppShortcut("Mod+Shift+>", onNextMonth, MONTH_PICKER_SHORTCUT_OPTIONS);
}
