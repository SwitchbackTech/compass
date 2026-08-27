import { useDraftStore } from "@web/events/stores/draft.store";
import { useEdgeFocusStore } from "@web/grid/shortcuts/edge-focus.store";
import { useGridScrollShortcuts } from "@web/grid/shortcuts/useGridScrollShortcuts";
import { isHigherEscapeOwner } from "@web/shortcuts/escape-ownership";
import { KEYMAP } from "@web/shortcuts/keymap";
import { isEventJumpActive } from "@web/shortcuts/shift-hint/event-jump.store";
import { shortcutHintProgressActions } from "@web/shortcuts/tips/shortcut-tips.progress.store";
import {
  useAppShortcut,
  useAppShortcutUp,
} from "@web/shortcuts/useAppShortcut";
import {
  setTimeTravelZone,
  useTimeTravelZone,
} from "@web/timezone/time-travel.store";
import { timezoneDialogActions } from "@web/timezone/timezone-dialog.store";

export interface CalendarViewShortcutsConfig {
  /** J / K: previous / next period (day or week). */
  onPrevPeriod?: () => void;
  onNextPeriod?: () => void;
  /** Shift+J / Shift+K: shift the visible window by a day (Week only). */
  onShiftViewBackward?: () => void;
  onShiftViewForward?: () => void;
  onGoToToday?: () => void;
  onCreateAllDayEvent?: () => void;
  onCreateTimedEvent?: () => void;
  onFocusCalendar?: () => void;
}

/**
 * Shared Day/Week view shortcuts: j/k navigate the period, t goes to today,
 * "c" creates a timed event, Shift+C creates an all-day event, and "u"
 * focuses the calendar;
 * PageUp/PageDown and Alt+ArrowUp/Down scroll the timed grid via
 * `useGridScrollShortcuts`.
 * Shift+J/K register only when the view provides a handler (Week's window
 * shift). "i" (focus sidebar) is registered separately via
 * useFocusSidebarShortcut. Behavior lives in each view's owner; this is only
 * the thin key-registration boundary.
 */
export function useCalendarViewShortcuts(config: CalendarViewShortcutsConfig) {
  const timeTravelZone = useTimeTravelZone();
  useGridScrollShortcuts();

  useAppShortcutUp("J", () => config.onPrevPeriod?.());
  useAppShortcutUp("K", () => config.onNextPeriod?.());
  useAppShortcutUp("Shift+J", () => config.onShiftViewBackward?.(), {
    enabled: config.onShiftViewBackward !== undefined,
  });
  useAppShortcutUp("Shift+K", () => config.onShiftViewForward?.(), {
    enabled: config.onShiftViewForward !== undefined,
  });
  useAppShortcutUp("T", () => config.onGoToToday?.());
  useAppShortcutUp("Shift+C", () => config.onCreateAllDayEvent?.());
  useAppShortcutUp(
    KEYMAP.createEvent.hotkey,
    () => {
      if (!config.onCreateTimedEvent) return;
      config.onCreateTimedEvent();
      shortcutHintProgressActions.demonstrate("create-event");
    },
    { telemetryHintId: "create-event" },
  );
  useAppShortcutUp("U", () => config.onFocusCalendar?.());
  // Keydown so a macOS Cmd+Z keyup-replay (meta already released) cannot
  // match this binding the way Mod+D vs D does on keyup.
  useAppShortcut("Z", () =>
    timezoneDialogActions.open(undefined, "time-travel"),
  );
  useAppShortcut(
    "Escape",
    () => {
      if (isHigherEscapeOwner()) return;
      if (useEdgeFocusStore.getState().eventId) return;
      if (isEventJumpActive()) return;
      const { gridDraft, status } = useDraftStore.getState();
      if (
        status?.activity === "keyboardPlace" &&
        !status.isFormOpen &&
        gridDraft
      ) {
        return;
      }
      setTimeTravelZone(null);
    },
    { enabled: timeTravelZone !== null },
  );
}
