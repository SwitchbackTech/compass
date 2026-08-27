import { ArrowClockwiseIcon } from "@phosphor-icons/react";
import { type FC } from "react";
import { reloadLocation } from "@web/common/utils/browser/browser-navigation.util";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";

/**
 * Header control shown when a newer app version is available. Clicks are
 * blocked in keyboard-only mode, so the tooltip names the browser reload
 * shortcut (Mod+R) rather than implying the icon itself is clickable.
 */
export const UpdateAvailableButton: FC = () => {
  return (
    <TooltipWrapper
      description="Get latest version"
      onClick={reloadLocation}
      shortcut={["Mod", "R"]}
    >
      <button
        aria-label="Get latest version"
        className="flex size-7 shrink-0 items-center justify-center rounded-default text-accent transition hover:bg-surface-panel hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        type="button"
      >
        <ArrowClockwiseIcon aria-hidden="true" size={16} />
      </button>
    </TooltipWrapper>
  );
};
