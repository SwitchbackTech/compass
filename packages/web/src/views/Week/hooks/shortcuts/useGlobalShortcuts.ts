import { type RegisterableHotkey } from "@tanstack/react-hotkeys";
import { useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSession } from "@web/auth/compass/session/useSession";
import { VIEW_SHORTCUTS } from "@web/common/constants/shortcuts.constants";
import { useAppHotkey, useAppHotkeyUp } from "@web/common/hooks/useAppHotkey";
import { useAuthModal } from "@web/components/AuthModal/hooks/useAuthModal";
import { useLogoutConfirmation } from "@web/components/LogoutConfirmation/hooks/useLogoutConfirmation";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { useAppDispatch } from "@web/store/store.hooks";

/**
 * Registers app-wide shortcuts via {@link useAppHotkey} / {@link useAppHotkeyUp}.
 * Mount once under {@link HotkeysProvider} (see `GlobalShortcutsHost` in CompassProvider).
 */
export function useGlobalShortcuts() {
  const dispatch = useAppDispatch();
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
  // bare "D" view shortcut below and incorrectly navigates to Day view after
  // a Cmd+D (duplicate event) press. Suppress that replayed keyup.
  const suppressDayShortcutRef = useRef(false);
  const suppressDayShortcutTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  useAppHotkey(
    "Mod+D",
    () => {
      suppressDayShortcutRef.current = true;

      if (suppressDayShortcutTimeoutRef.current) {
        clearTimeout(suppressDayShortcutTimeoutRef.current);
      }

      suppressDayShortcutTimeoutRef.current = setTimeout(() => {
        suppressDayShortcutRef.current = false;
      }, 1000);
    },
    {
      ignoreInputs: false,
      preventDefault: false,
      stopPropagation: false,
      conflictBehavior: "allow",
    },
  );

  useAppHotkeyUp(dayHotkey, () => {
    if (suppressDayShortcutRef.current) {
      suppressDayShortcutRef.current = false;

      if (suppressDayShortcutTimeoutRef.current) {
        clearTimeout(suppressDayShortcutTimeoutRef.current);
        suppressDayShortcutTimeoutRef.current = null;
      }

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
      dispatch(settingsSlice.actions.toggleCmdPalette());
    },
    {
      ignoreInputs: false,
      blurOnTrigger: true,
    },
  );

  useAppHotkey(
    "Escape",
    () => {
      dispatch(settingsSlice.actions.closeCmdPalette());
    },
    {
      ignoreInputs: false,
      blurOnTrigger: true,
    },
  );
}
