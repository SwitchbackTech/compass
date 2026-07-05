import { type FC } from "react";
import { theme } from "@web/common/styles/theme";
import { ArrowButton } from "@web/components/Button/ArrowButton";
import { SidebarIcon } from "@web/components/Icons/Sidebar";
import { SelectView } from "@web/components/SelectView/SelectView";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import {
  selectIsSidebarOpen,
  useViewStore,
  viewActions,
} from "@web/events/stores/view.store";
import { TodayButton } from "@web/views/Week/components/TodayButton/TodayButton";

interface Props {
  /** Left-aligned heading text (e.g. "June 2026" or "Wednesday, July 1"). */
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  isToday: boolean;
  /** Accessible + tooltip label for the previous arrow, e.g. "Previous week". */
  prevLabel: string;
  /** Accessible + tooltip label for the next arrow, e.g. "Next week". */
  nextLabel: string;
}

/**
 * Shared header for the Day and Week views: a left-aligned heading and a
 * right-aligned control cluster (view switcher, today, prev/next).
 * Owns the heading markup, sidebar-toggle state, and the control layout so both
 * views stay consistent without re-wiring these concerns per caller.
 */
export const CalendarHeader: FC<Props> = ({
  label,
  onPrev,
  onNext,
  onToday,
  isToday,
  prevLabel,
  nextLabel,
}) => {
  const isSidebarOpen = useViewStore(selectIsSidebarOpen);

  return (
    <div className="flex h-12 w-full shrink-0 items-center text-text-light">
      {!isSidebarOpen ? (
        <TooltipWrapper
          description="Open sidebar"
          onClick={() => viewActions.toggleSidebar()}
          shortcut="["
        >
          <span className="flex h-6 w-6 items-center justify-center">
            <SidebarIcon color={theme.color.text.lightInactive} size={21} />
          </span>
        </TooltipWrapper>
      ) : null}

      <h1 className="pl-8 text-text-lighter" aria-live="polite">
        <span className="relative text-xl">{label}</span>
      </h1>

      <div className="z-2 ml-auto flex items-center gap-3 pr-5">
        <SelectView />
        <TodayButton navigateToToday={onToday} isToday={isToday} />
        <TooltipWrapper shortcut="J">
          <ArrowButton direction="left" label={prevLabel} onClick={onPrev} />
        </TooltipWrapper>
        <TooltipWrapper shortcut="K">
          <ArrowButton direction="right" label={nextLabel} onClick={onNext} />
        </TooltipWrapper>
      </div>
    </div>
  );
};
