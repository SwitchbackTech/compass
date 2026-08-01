import { XIcon } from "@phosphor-icons/react";
import { type FC } from "react";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { viewActions } from "@web/events/stores/view.store";

/**
 * Narrow-layout dismiss control rendered inside the sidebar. Uses a distinct
 * accessible name from the header toggle so the two controls do not collide
 * while the panel is open, and restores focus to the header "Open sidebar"
 * control after close.
 */
export const SidebarCloseButton: FC = () => {
  return (
    <TooltipWrapper
      description="Close sidebar"
      onClick={() => {
        viewActions.setSidebarOpen(false);
        // The header toggle stays mounted and flips to "Open sidebar"; move
        // focus there after this in-sidebar control unmounts.
        window.setTimeout(() => {
          document
            .querySelector<HTMLButtonElement>('[aria-label="Open sidebar"]')
            ?.focus();
        }, 0);
      }}
      shortcut="]"
    >
      <button
        type="button"
        aria-label="Dismiss sidebar"
        className="c-focus-ring flex h-6 w-6 cursor-pointer items-center justify-center text-text-muted"
      >
        <XIcon aria-hidden="true" size={16} />
      </button>
    </TooltipWrapper>
  );
};
