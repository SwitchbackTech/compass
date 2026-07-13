import {
  useAppShortcut,
  useAppShortcutUp,
} from "@web/shortcuts/useAppShortcut";

interface KeyboardShortcutsConfig {
  // Event management
  onCreateTimedEvent?: () => void;
  onCreateAllDayEvent?: () => void;
  onEditEvent?: () => void;

  // Focus
  onFocusSidebar?: () => void;
  onFocusCalendar?: () => void;

  // Day navigation
  onNextDay?: () => void;
  onPrevDay?: () => void;
  onGoToToday?: () => void;

  // General
  onEscape?: () => void;
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
    onEditEvent,
    onFocusSidebar,
    onFocusCalendar,
    onNextDay,
    onPrevDay,
    onGoToToday,
    onEscape,
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

  useAppShortcut(
    "Escape",
    () => {
      onEscape?.();
    },
    {
      ignoreInputs: false,
      blurOnTrigger: true,
    },
  );

  // Calendar shortcuts
  useAppShortcutUp("I", () => {
    onFocusCalendar?.();
  });

  useAppShortcutUp("M", () => {
    onEditEvent?.();
  });
}
