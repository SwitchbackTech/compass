import { type RegisterableHotkey } from "@tanstack/react-hotkeys";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { VIEW_SHORTCUTS } from "@web/common/constants/shortcuts.constants";
import { useAppHotkey, useAppHotkeyUp } from "@web/common/hooks/useAppHotkey";
import { viewSlice } from "@web/ducks/events/slices/view.slice";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { useAppDispatch } from "@web/store/store.hooks";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Registers app-wide shortcuts via {@link useAppHotkey} / {@link useAppHotkeyUp}.
 * Mount once under {@link HotkeysProvider} (see `GlobalShortcutsHost` in CompassProvider).
 */
export function useGlobalShortcuts() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const nowHotkey = VIEW_SHORTCUTS.now.key.toUpperCase() as RegisterableHotkey;
  const dayHotkey = VIEW_SHORTCUTS.day.key.toUpperCase() as RegisterableHotkey;
  const weekHotkey =
    VIEW_SHORTCUTS.week.key.toUpperCase() as RegisterableHotkey;

  useAppHotkeyUp(nowHotkey, () => {
    if (location.pathname !== VIEW_SHORTCUTS.now.route) {
      navigate(VIEW_SHORTCUTS.now.route);
    }
  });

  useAppHotkeyUp(dayHotkey, () => {
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
    navigate(ROOT_ROUTES.LOGOUT);
  });

  useAppHotkeyUp("R", () => {
    dispatch(viewSlice.actions.updateReminder(true));
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
