import { ArrowClockwiseIcon } from "@phosphor-icons/react";
import { type FC } from "react";
import { reloadLocation } from "@web/common/utils/browser/browser-navigation.util";
import { ArrowButton } from "@web/components/Button/ArrowButton";
import { SelectView } from "@web/components/SelectView/SelectView";
import { useVersionCheck } from "@web/components/Sidebar/SidebarActions/useVersionCheck";
import { SidebarToggleButton } from "@web/components/Sidebar/SidebarToggleButton";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";

interface Props {
  /** Left-aligned heading text (e.g. "June 2026" or "Wednesday, July 1"). */
  label: string;
  onPrev?: () => void;
  onNext?: () => void;
  onToday?: () => void;
  showNavigation?: boolean;
  /** Accessible + tooltip label for the previous arrow, e.g. "Previous week". */
  prevLabel?: string;
  /** Accessible + tooltip label for the next arrow, e.g. "Next week". */
  nextLabel?: string;
}

/**
 * Shared header for the Day, Week, and Life views: a left-aligned cluster for
 * navigation and orientation (prev/next, then the view switcher) so the
 * arrows sit at a fixed position regardless of the title's width, and a
 * right-aligned sidebar toggle.
 * Owns the heading markup, sidebar-toggle state, and the control layout so both
 * views stay consistent without re-wiring these concerns per caller.
 */
export const CalendarHeader: FC<Props> = ({
  label,
  onPrev,
  onNext,
  onToday,
  prevLabel = "Previous",
  nextLabel = "Next",
  showNavigation = true,
}) => {
  const { isUpdateAvailable } = useVersionCheck();

  return (
    <div className="flex h-12 w-full shrink-0 items-center gap-3 text-text-muted">
      {/* min-w-0 lets the title cluster shrink so the sidebar toggle stays in
          layout. Avoid overflow-hidden here — SelectView's menu is absolutely
          positioned inside this cluster and must paint below the header. */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {showNavigation && onPrev && onNext && (
          <>
            <TooltipWrapper shortcut="J">
              <ArrowButton
                direction="left"
                label={prevLabel}
                onClick={onPrev}
              />
            </TooltipWrapper>
            <TooltipWrapper shortcut="K">
              <ArrowButton
                direction="right"
                label={nextLabel}
                onClick={onNext}
              />
            </TooltipWrapper>
          </>
        )}
        <SelectView label={label} onToday={onToday} />
        {isUpdateAvailable ? (
          <TooltipWrapper
            description="Get latest version"
            onClick={reloadLocation}
          >
            <button
              aria-label="Get latest version"
              className="flex size-7 shrink-0 items-center justify-center rounded-default text-accent transition hover:bg-surface-panel hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              type="button"
            >
              <ArrowClockwiseIcon aria-hidden="true" size={16} />
            </button>
          </TooltipWrapper>
        ) : null}
      </div>

      <div className="z-2 flex shrink-0 items-center pr-5">
        <SidebarToggleButton />
      </div>
    </div>
  );
};
