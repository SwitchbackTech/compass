import { type FC, type ReactNode } from "react";
import { theme } from "@web/common/styles/theme";
import { ArrowButton } from "@web/components/Button/ArrowButton";
import { HeaderInfoIcon } from "@web/components/HeaderInfoIcon/HeaderInfoIcon";
import { SidebarIcon } from "@web/components/Icons/Sidebar";
import { SelectView } from "@web/components/SelectView/SelectView";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { TodayButton } from "@web/views/Week/components/TodayButton/TodayButton";

interface Props {
  /** Left-aligned label node. Caller owns the heading element / aria-live. */
  label: ReactNode;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  isToday: boolean;
  /** Accessible + tooltip label for the previous arrow, e.g. "Previous week". */
  prevLabel: string;
  /** Accessible + tooltip label for the next arrow, e.g. "Next week". */
  nextLabel: string;
  prevShortcut?: string;
  nextShortcut?: string;
}

/**
 * Shared header shell for the Day and Week views: a left-aligned label slot and
 * a right-aligned control cluster (info icon, view switcher, today, prev/next).
 * Both views compose this so the label, `SelectView`, and navigation always sit
 * on the same horizontal plane and reuse the same building blocks.
 */
export const CalendarHeader: FC<Props> = ({
  label,
  isSidebarOpen,
  onToggleSidebar,
  onPrev,
  onNext,
  onToday,
  isToday,
  prevLabel,
  nextLabel,
  prevShortcut = "J",
  nextShortcut = "K",
}) => {
  return (
    <div className="relative flex h-12 w-full shrink-0 items-center justify-between text-text-light">
      {!isSidebarOpen ? (
        <TooltipWrapper
          description="Open sidebar"
          onClick={onToggleSidebar}
          shortcut="["
        >
          <span className="flex h-6 w-6 items-center justify-center">
            <SidebarIcon color={theme.color.text.lightInactive} size={21} />
          </span>
        </TooltipWrapper>
      ) : null}

      {label}

      <div className="z-2 flex items-center gap-3 pr-5">
        <HeaderInfoIcon />
        <SelectView />
        <TodayButton navigateToToday={onToday} isToday={isToday} />
        <TooltipWrapper shortcut={prevShortcut}>
          <ArrowButton direction="left" label={prevLabel} onClick={onPrev} />
        </TooltipWrapper>
        <TooltipWrapper shortcut={nextShortcut}>
          <ArrowButton direction="right" label={nextLabel} onClick={onNext} />
        </TooltipWrapper>
      </div>
    </div>
  );
};
