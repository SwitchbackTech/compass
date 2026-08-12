import { KEYMAP } from "@web/shortcuts/keymap";
import { useAppShortcutUp } from "@web/shortcuts/useAppShortcut";

interface KeyboardShortcutsConfig {
  // Event management
  onCreateTimedEvent?: () => void;
  onCreateAllDayEvent?: () => void;

  // Focus
  onFocusCalendar?: () => void;

  // Day navigation
  onNextDay?: () => void;
  onPrevDay?: () => void;
  onGoToToday?: () => void;
}

/**
 * Hook to handle keyboard shortcuts for the Day view.
 *
 * Mirrors the Week view's create/focus semantics: "c" creates a timed event,
 * "a" an all-day event, "u" the calendar. "i" (focus sidebar) is registered
 * separately via useFocusSidebarShortcut, shared with Week.
 */
export function useDayViewShortcuts(config: KeyboardShortcutsConfig) {
  const {
    onCreateTimedEvent,
    onCreateAllDayEvent,
    onFocusCalendar,
    onNextDay,
    onPrevDay,
    onGoToToday,
  } = config;

  useAppShortcutUp("J", () => {
    onPrevDay?.();
  });

  useAppShortcutUp("K", () => {
    onNextDay?.();
  });

  useAppShortcutUp("T", () => {
    onGoToToday?.();
  });

  useAppShortcutUp("U", () => {
    onFocusCalendar?.();
  });

  useAppShortcutUp(KEYMAP.createEvent.hotkey, () => {
    onCreateTimedEvent?.();
  });

  useAppShortcutUp("A", () => {
    onCreateAllDayEvent?.();
  });
}
