import { useNavigate } from "react-router-dom";
import { ROOT_ROUTES } from "@web/common/constants/routes";
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

  useKeyUpEvent({
    combination: ["1"],
    deps: [navigate],
    handler: () => navigate(ROOT_ROUTES.NOW),
  });

  useKeyUpEvent({
    combination: ["2"],
    deps: [navigate],
    handler: () => navigate(ROOT_ROUTES.DAY),
  });

  useKeyUpEvent({
    combination: ["3"],
    deps: [navigate],
    handler: () => navigate(ROOT_ROUTES.WEEK),
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
