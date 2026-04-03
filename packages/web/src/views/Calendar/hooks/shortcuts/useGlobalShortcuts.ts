import { useLocation, useNavigate } from "react-router-dom";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { useShortcutEditMode } from "@web/common/context/shortcut-edit-mode";
import { useAppHotkey, useAppHotkeyUp } from "@web/common/hooks/useAppHotkey";
import { SHORTCUTS } from "@web/common/shortcuts/shortcut.registry";
import { viewSlice } from "@web/ducks/events/slices/view.slice";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { useAppDispatch } from "@web/store/store.hooks";

/**
 * Registers app-wide shortcuts via {@link useAppHotkey} / {@link useAppHotkeyUp}.
 * Mount once under {@link HotkeysProvider} (see `GlobalShortcutsHost` in CompassProvider).
 */
export function useGlobalShortcuts() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { isEditMode } = useShortcutEditMode();

  const isNowEditMode = location.pathname === ROOT_ROUTES.NOW && isEditMode;

  useAppHotkeyUp(SHORTCUTS.NAV_NOW.hotkey, () => {
    if (location.pathname !== ROOT_ROUTES.NOW) {
      navigate(ROOT_ROUTES.NOW);
    }
  });

  useAppHotkeyUp(
    SHORTCUTS.NAV_DAY.hotkey,
    () => {
      if (!location.pathname.startsWith(ROOT_ROUTES.DAY)) {
        navigate(ROOT_ROUTES.DAY);
      }
    },
    {
      enabled: !isNowEditMode,
    },
  );

  useAppHotkeyUp(SHORTCUTS.NAV_WEEK.hotkey, () => {
    if (location.pathname !== ROOT_ROUTES.WEEK) {
      navigate(ROOT_ROUTES.WEEK);
    }
  });

  useAppHotkeyUp(SHORTCUTS.NAV_LOGOUT.hotkey, () => {
    navigate(ROOT_ROUTES.LOGOUT);
  });

  useAppHotkeyUp(SHORTCUTS.NAV_REMINDER.hotkey, () => {
    dispatch(viewSlice.actions.updateReminder(true));
  });

  useAppHotkey(
    SHORTCUTS.CMD_PALETTE.hotkey,
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
