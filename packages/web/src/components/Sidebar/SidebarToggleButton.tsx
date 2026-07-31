import { type FC } from "react";
import { colors } from "@web/common/styles/colors";
import { SidebarIcon } from "@web/components/Icons/Sidebar";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import {
  selectIsSidebarOpen,
  useViewStore,
  viewActions,
} from "@web/events/stores/view.store";

/**
 * Shared open/close control for the right sidebar. Used in the calendar
 * header and, on narrow viewports, inside the sidebar itself when the
 * header control is squeezed out of view.
 */
export const SidebarToggleButton: FC = () => {
  const isSidebarOpen = useViewStore(selectIsSidebarOpen);

  return (
    <TooltipWrapper
      description={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
      onClick={() => viewActions.toggleSidebar()}
      shortcut="]"
    >
      <button
        type="button"
        aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
        className="c-focus-ring flex h-6 w-6 cursor-pointer items-center justify-center"
      >
        <SidebarIcon color={colors.textMuted} size={21} />
      </button>
    </TooltipWrapper>
  );
};
