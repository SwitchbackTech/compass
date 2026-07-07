import { type RegisterableHotkey } from "@tanstack/react-hotkeys";
import { useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSession } from "@web/auth/compass/session/useSession";
import { VIEW_SHORTCUTS } from "@web/common/constants/shortcuts.constants";
import { useAppHotkey, useAppHotkeyUp } from "@web/common/hotkeys/useAppHotkey";
import { useAuthModal } from "@web/components/AuthModal/hooks/useAuthModal";
import { useLogoutConfirmation } from "@web/components/LogoutConfirmation/hooks/useLogoutConfirmation";
import { viewActions } from "@web/events/stores/view.store";
import { settingsActions } from "@web/settings/settings.store";

/**
 * Registers app-wide shortcuts via {@link useAppHotkey} / {@link useAppHotkeyUp}.
 * Mount once under {@link HotkeysProvider} (see `GlobalShortcutsHost` in CompassProvider).
 */
export function useGlobalShortcuts() {
  const { authenticated } = useSession();
  const { openModal } = useAuthModal();
  const { openLogoutConfirmation } = useLogoutConfirmation();
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

  useAppHotkey(
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

  useAppHotkeyUp(dayHotkey, () => {
    if (Date.now() < suppressDayShortcutUntilRef.current) {
      suppressDayShortcutUntilRef.current = 0;
      return;
    }

    if (!location.pathname.startsWith(VIEW_SHORTCUTS.day.route)) {
      navigate(VIEW_SHORTCUTS.day.route);
    }
  });

  useAppHotkeyUp(weekHotkey, () => {
    if (location.pathname !== VIEW_SHORTCUTS.week.route) {
      navigate(VIEW_SHORTCUTS.week.route);
    }
  });

  useAppHotkeyUp("[", () => viewActions.toggleSidebar());

  useAppHotkeyUp("Z", () => {
    if (authenticated) {
      openLogoutConfirmation();
      return;
    }

    openModal("login");
  });

  useAppHotkey(
    "Mod+K",
    () => {
      settingsActions.toggleCmdPalette();
    },
    {
      ignoreInputs: false,
      blurOnTrigger: true,
    },
  );

  useAppHotkey(
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
