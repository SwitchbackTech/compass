import { type RegisterableHotkey } from "@tanstack/react-hotkeys";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useRef } from "react";
import { viewActions } from "@web/events/stores/view.store";
import { settingsActions } from "@web/settings/settings.store";
import { VIEW_SHORTCUTS } from "@web/shortcuts/shortcuts.constants";
import {
  useAppShortcut,
  useAppShortcutUp,
} from "@web/shortcuts/useAppShortcut";

/**
 * Registers app-wide shortcuts via {@link useAppShortcut} / {@link useAppShortcutUp}.
 * Mount once under {@link HotkeysProvider} (see `GlobalShortcutsHost` in CompassProvider).
 */
export function useGlobalShortcuts() {
  const navigate = useNavigate();
  const location = useLocation();
  const dayHotkey = VIEW_SHORTCUTS.day.key.toUpperCase() as RegisterableHotkey;
  const weekHotkey =
    VIEW_SHORTCUTS.week.key.toUpperCase() as RegisterableHotkey;

  // macOS swallows the keyup for a letter held with Cmd until Cmd itself is
  // released, then replays it with metaKey already false — which matches the
  // bare "D" view shortcut below and incorrectly navigates to Day view right
  // after a Cmd+D (duplicate event) press. Ignore the Day shortcut for a
  // short window after Mod+D fires to filter out that replayed keyup.
  const suppressDayShortcutUntilRef = useRef(0);

  useAppShortcut(
    "Mod+D",
    () => {
      suppressDayShortcutUntilRef.current = Date.now() + 1000;
    },
    {
      ignoreInputs: false,
      preventDefault: false,
      stopPropagation: false,
      conflictBehavior: "allow",
    },
  );

  useAppShortcutUp(dayHotkey, () => {
    if (Date.now() < suppressDayShortcutUntilRef.current) {
      suppressDayShortcutUntilRef.current = 0;
      return;
    }

    if (!location.pathname.startsWith(VIEW_SHORTCUTS.day.route)) {
      navigate({ to: VIEW_SHORTCUTS.day.route });
    }
  });

  useAppShortcutUp(weekHotkey, () => {
    if (!location.pathname.startsWith(VIEW_SHORTCUTS.week.route)) {
      navigate({ to: VIEW_SHORTCUTS.week.route });
    }
  });

  useAppShortcutUp("[", () => viewActions.toggleSidebar());

  useAppShortcut(
    "Mod+K",
    () => {
      settingsActions.toggleCmdPalette();
    },
    {
      ignoreInputs: false,
      blurOnTrigger: true,
    },
  );

  useAppShortcut(
    "Escape",
    () => {
      settingsActions.closeCmdPalette();
    },
    {
      ignoreInputs: false,
      blurOnTrigger: true,
    },
  );
}
