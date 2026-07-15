import {
  useAppShortcut,
  useAppShortcutUp,
} from "@web/shortcuts/useAppShortcut";

interface KeyboardShortcutsConfig {
  // Event management
  onCreateTimedEvent?: () => void;
  onCreateAllDayEvent?: () => void;

  // Focus
  onFocusSidebar?: () => void;
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
 * "a" an all-day event, "u" focuses the sidebar, "i" the calendar.
 */
export function useDayViewShortcuts(config: KeyboardShortcutsConfig) {
  const {
    onCreateTimedEvent,
    onCreateAllDayEvent,
    onFocusSidebar,
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
    onFocusSidebar?.();
  });

  useAppShortcutUp("C", () => {
    onCreateTimedEvent?.();
  });

  useAppShortcutUp("A", () => {
    onCreateAllDayEvent?.();
  });

  // No handler body: this registration exists only for blurOnTrigger, which
  // blurs the focused element on Escape regardless of the callback.
  useAppShortcut("Escape", () => {}, {
    ignoreInputs: false,
    blurOnTrigger: true,
  });

  // Calendar shortcuts
  useAppShortcutUp("I", () => {
    onFocusCalendar?.();
  });
}
