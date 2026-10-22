import { APP_SHORTCUT_BINDINGS } from "@core/shortcuts/app-shortcut-bindings";
import {
  MONTH_PICKER_CURRENT_HOTKEY,
  MONTH_PICKER_CURRENT_KEYCAPS,
  MONTH_PICKER_NEXT_HOTKEY,
  MONTH_PICKER_NEXT_KEYCAPS,
  MONTH_PICKER_PREV_HOTKEY,
  MONTH_PICKER_PREV_KEYCAPS,
} from "@core/shortcuts/binding-keycaps.constants";
import {
  useAppShortcut,
  useAppShortcutUp,
} from "@web/shortcuts/useAppShortcut";

export {
  MONTH_PICKER_CURRENT_HOTKEY,
  MONTH_PICKER_CURRENT_KEYCAPS,
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

const MONTH_PICKER_CURRENT_OPTIONS = {
  ...MONTH_PICKER_SHORTCUT_OPTIONS,
  shortcutId: "nav-month-current" as const,
};

/**
 * Mod+Alt+J / Mod+Alt+K step the picker's displayed month the same
 * way the chevrons do. Mod+Alt+T and plain T (keyup, alongside grid
 * "today") return the picker to the current month without moving the grid.
 * Registered only while the owner enables it (sidebar picker, or a grid
 * popover on the day grid). Mod chords fire in inputs.
 */
export function useMonthPickerShortcuts({
  enabled = true,
  onPrevMonth,
  onNextMonth,
  onGoToThisMonth,
}: {
  enabled?: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onGoToThisMonth?: () => void;
}) {
  useAppShortcut(MONTH_PICKER_PREV_HOTKEY, onPrevMonth, {
    ...MONTH_PICKER_PREV_OPTIONS,
    enabled,
  });
  useAppShortcut(MONTH_PICKER_NEXT_HOTKEY, onNextMonth, {
    ...MONTH_PICKER_NEXT_OPTIONS,
    enabled,
  });
  useAppShortcut(
    MONTH_PICKER_CURRENT_HOTKEY,
    () => {
      onGoToThisMonth?.();
    },
    {
      ...MONTH_PICKER_CURRENT_OPTIONS,
      enabled: enabled && onGoToThisMonth !== undefined,
    },
  );
  useAppShortcutUp(
    APP_SHORTCUT_BINDINGS.navToday.hotkey,
    () => {
      onGoToThisMonth?.();
    },
    {
      enabled: enabled && onGoToThisMonth !== undefined,
      conflictBehavior: "allow",
    },
  );
}
