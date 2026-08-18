import { useGridScrollShortcuts } from "@web/grid/shortcuts/useGridScrollShortcuts";
import { KEYMAP } from "@web/shortcuts/keymap";
import { useAppShortcutUp } from "@web/shortcuts/useAppShortcut";

export interface WeekViewShortcutsConfig {
  onPreviousWeek?: () => void;
  onNextWeek?: () => void;
  onShiftViewBackward?: () => void;
  onShiftViewForward?: () => void;
  onGoToToday?: () => void;
  onCreateAllDayDraft?: () => void;
  onCreateTimedDraft?: () => void;
  onFocusCalendar?: () => void;
}

/**
 * Registers Week view keyboard shortcuts only. Behavior lives in the owner
 * (see `useWeekShortcutOwner`), matching Day's thin callback boundary.
 * PageUp/PageDown scroll the timed grid via `useGridScrollShortcuts`.
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
  } = config;

  useGridScrollShortcuts();

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
  useAppShortcutUp(KEYMAP.createEvent.hotkey, () => {
    onCreateTimedDraft?.();
  });
  useAppShortcutUp("U", () => {
    onFocusCalendar?.();
  });
}
