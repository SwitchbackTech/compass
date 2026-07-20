import { type FC } from "react";
import { colors } from "@web/common/styles/colors";
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
 * Shared header for the Day and Week views: a left-aligned cluster for
 * orientation and navigation (view switcher, prev/next, today), and a
 * right-aligned sidebar toggle.
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
    <div className="flex h-12 w-full shrink-0 items-center gap-3 text-text-muted">
      <SelectView label={label} />
      <TooltipWrapper shortcut="J">
        <ArrowButton direction="left" label={prevLabel} onClick={onPrev} />
      </TooltipWrapper>
      <TooltipWrapper shortcut="K">
        <ArrowButton direction="right" label={nextLabel} onClick={onNext} />
      </TooltipWrapper>
      <TodayButton navigateToToday={onToday} isToday={isToday} />

      <div className="z-2 ml-auto flex items-center pr-5">
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
      </div>
    </div>
  );
};
