import { useLocation, useNavigate } from "react-router-dom";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { VIEW_SHORTCUTS } from "@web/common/constants/shortcuts.constants";
import {
  useKeyDownEvent,
  useKeyUpEvent,
} from "@web/common/hooks/useKeyboardEvent";
import { getModifierKey } from "@web/common/utils/shortcut/shortcut.util";
import { viewSlice } from "@web/ducks/events/slices/view.slice";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { useAppDispatch } from "@web/store/store.hooks";

/**
 * Hook to handle global keyboard shortcuts
 */
export function useGlobalShortcuts() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  useKeyUpEvent({
    combination: [VIEW_SHORTCUTS.now.key],
    deps: [navigate, location.pathname],
    handler: () => {
      if (location.pathname !== VIEW_SHORTCUTS.now.route) {
        navigate(VIEW_SHORTCUTS.now.route);
      }
    },
  });

  useKeyUpEvent({
    combination: [VIEW_SHORTCUTS.day.key],
    deps: [navigate, location.pathname],
    handler: () => {
      if (!location.pathname.startsWith(VIEW_SHORTCUTS.day.route)) {
        navigate(VIEW_SHORTCUTS.day.route);
      }
    },
  });

  useKeyUpEvent({
    combination: [VIEW_SHORTCUTS.week.key],
    deps: [navigate, location.pathname],
    handler: () => {
      if (location.pathname !== VIEW_SHORTCUTS.week.route) {
        navigate(VIEW_SHORTCUTS.week.route);
      }
    },
  });

  useKeyUpEvent({
    combination: ["z"],
    deps: [navigate],
    handler: () => navigate(ROOT_ROUTES.LOGOUT),
  });

  useKeyUpEvent({
    combination: ["r"],
    deps: [dispatch],
    handler: () => dispatch(viewSlice.actions.updateReminder(true)),
  });

  useKeyDownEvent({
    combination: [getModifierKey(), "k"],
    deps: [dispatch],
    listenWhileEditing: true,
    handler: () => dispatch(settingsSlice.actions.toggleCmdPalette()),
  });

  useKeyDownEvent({
    combination: ["Escape"],
    deps: [dispatch],
    listenWhileEditing: true,
    handler: () => dispatch(settingsSlice.actions.closeCmdPalette()),
  });
}
