import {
  useAppShortcut,
  useAppShortcutUp,
} from "@web/shortcuts/useAppShortcut";

export interface WeekViewShortcutsConfig {
  onPreviousWeek?: () => void;
  onNextWeek?: () => void;
  onShiftViewBackward?: () => void;
  onShiftViewForward?: () => void;
  onGoToToday?: () => void;
  onCreateAllDayDraft?: () => void;
  onCreateTimedDraft?: () => void;
  onFocusCalendar?: () => void;
  /**
   * Digit `1`–`7` → focus first event on that leftmost→rightmost week column.
   * Return true when the digit was handled so the key event can be consumed.
   */
  onFocusWeekdayColumn?: (
    columnIndex: number,
    keyboardEvent: KeyboardEvent,
  ) => boolean;
}

const DIGIT_HOTKEY_OPTIONS = {
  ignoreInputs: false,
  preventDefault: false,
  stopPropagation: false,
  conflictBehavior: "allow" as const,
};

/**
 * Registers Week view keyboard shortcuts only. Behavior lives in the owner
 * (see `useWeekShortcutOwner`), matching Day's thin callback boundary.
 */
export function useWeekViewShortcuts(config: WeekViewShortcutsConfig) {
  const {
    onPreviousWeek,
    onNextWeek,
    onShiftViewBackward,
    onShiftViewForward,
    onGoToToday,
    onCreateAllDayDraft,
    onCreateTimedDraft,
    onFocusCalendar,
    onFocusWeekdayColumn,
  } = config;

  useAppShortcutUp("J", () => {
    onPreviousWeek?.();
  });
  useAppShortcutUp("K", () => {
    onNextWeek?.();
  });
  useAppShortcutUp("Shift+J", () => {
    onShiftViewBackward?.();
  });
  useAppShortcutUp("Shift+K", () => {
    onShiftViewForward?.();
  });
  useAppShortcutUp("T", () => {
    onGoToToday?.();
  });
  useAppShortcutUp("A", () => {
    onCreateAllDayDraft?.();
  });
  useAppShortcutUp("C", () => {
    onCreateTimedDraft?.();
  });
  useAppShortcutUp("U", () => {
    onFocusCalendar?.();
  });

  useAppShortcut(
    "1",
    (keyboardEvent) => {
      if (!onFocusWeekdayColumn?.(0, keyboardEvent)) return;
      keyboardEvent.preventDefault();
      keyboardEvent.stopPropagation();
    },
    DIGIT_HOTKEY_OPTIONS,
  );
  useAppShortcut(
    "2",
    (keyboardEvent) => {
      if (!onFocusWeekdayColumn?.(1, keyboardEvent)) return;
      keyboardEvent.preventDefault();
      keyboardEvent.stopPropagation();
    },
    DIGIT_HOTKEY_OPTIONS,
  );
  useAppShortcut(
    "3",
    (keyboardEvent) => {
      if (!onFocusWeekdayColumn?.(2, keyboardEvent)) return;
      keyboardEvent.preventDefault();
      keyboardEvent.stopPropagation();
    },
    DIGIT_HOTKEY_OPTIONS,
  );
  useAppShortcut(
    "4",
    (keyboardEvent) => {
      if (!onFocusWeekdayColumn?.(3, keyboardEvent)) return;
      keyboardEvent.preventDefault();
      keyboardEvent.stopPropagation();
    },
    DIGIT_HOTKEY_OPTIONS,
  );
  useAppShortcut(
    "5",
    (keyboardEvent) => {
      if (!onFocusWeekdayColumn?.(4, keyboardEvent)) return;
      keyboardEvent.preventDefault();
      keyboardEvent.stopPropagation();
    },
    DIGIT_HOTKEY_OPTIONS,
  );
  useAppShortcut(
    "6",
    (keyboardEvent) => {
      if (!onFocusWeekdayColumn?.(5, keyboardEvent)) return;
      keyboardEvent.preventDefault();
      keyboardEvent.stopPropagation();
    },
    DIGIT_HOTKEY_OPTIONS,
  );
  useAppShortcut(
    "7",
    (keyboardEvent) => {
      if (!onFocusWeekdayColumn?.(6, keyboardEvent)) return;
      keyboardEvent.preventDefault();
      keyboardEvent.stopPropagation();
    },
    DIGIT_HOTKEY_OPTIONS,
  );
}
