import { focusFirstSidebarItem } from "@web/components/Sidebar/util/sidebarFocus.util";
import {
  selectIsSidebarOpen,
  useViewStore,
  viewActions,
} from "@web/events/stores/view.store";
import { useAppShortcutUp } from "@web/shortcuts/useAppShortcut";

/** Mount once per view: registers the "i" hotkey, which opens the sidebar
 * (if closed) and focuses its first item, or just focuses it if already open. */
export function useFocusSidebarShortcut() {
  useAppShortcutUp("I", () => {
    if (selectIsSidebarOpen(useViewStore.getState())) {
      focusFirstSidebarItem();
      return;
    }

    viewActions.setSidebarOpen(true);
    // The sidebar renders conditionally; focus after the open commits.
    requestAnimationFrame(() => focusFirstSidebarItem());
  });
}
