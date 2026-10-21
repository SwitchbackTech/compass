import {
  MONTH_PICKER_NEXT_HOTKEY,
  MONTH_PICKER_NEXT_KEYCAPS,
  MONTH_PICKER_PREV_HOTKEY,
  MONTH_PICKER_PREV_KEYCAPS,
} from "@core/shortcuts/binding-keycaps.constants";
import { useAppShortcut } from "@web/shortcuts/useAppShortcut";

export {
  MONTH_PICKER_NEXT_HOTKEY,
  MONTH_PICKER_NEXT_KEYCAPS,
  MONTH_PICKER_PREV_HOTKEY,
  MONTH_PICKER_PREV_KEYCAPS,
};

const MONTH_PICKER_SHORTCUT_OPTIONS = {
  preventDefault: true,
  stopPropagation: true,
} as const;

const MONTH_PICKER_PREV_OPTIONS = {
  ...MONTH_PICKER_SHORTCUT_OPTIONS,
  shortcutId: "nav-month-prev" as const,
};

const MONTH_PICKER_NEXT_OPTIONS = {
  ...MONTH_PICKER_SHORTCUT_OPTIONS,
  shortcutId: "nav-month-next" as const,
};

/**
 * Mod+Alt+Shift+J / Mod+Alt+Shift+K step the picker's displayed month the same
 * way the chevrons do. Registered only while the owner enables it (sidebar
 * picker, or a grid popover on the day grid). Mod chords fire in inputs.
 */
export function useMonthPickerShortcuts({
  enabled = true,
  onPrevMonth,
  onNextMonth,
}: {
  enabled?: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  useAppShortcut(MONTH_PICKER_PREV_HOTKEY, onPrevMonth, {
    ...MONTH_PICKER_PREV_OPTIONS,
    enabled,
  });
  useAppShortcut(MONTH_PICKER_NEXT_HOTKEY, onNextMonth, {
    ...MONTH_PICKER_NEXT_OPTIONS,
    enabled,
  });
}
