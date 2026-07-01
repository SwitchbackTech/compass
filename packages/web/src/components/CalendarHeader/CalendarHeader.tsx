import { type FC } from "react";
import { theme } from "@web/common/styles/theme";
import { ArrowButton } from "@web/components/Button/ArrowButton";
import { HeaderInfoIcon } from "@web/components/HeaderInfoIcon/HeaderInfoIcon";
import { SidebarIcon } from "@web/components/Icons/Sidebar";
import { SelectView } from "@web/components/SelectView/SelectView";
import { Text } from "@web/components/Text/Text";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { selectIsSidebarOpen } from "@web/ducks/events/selectors/view.selectors";
import { viewSlice } from "@web/ducks/events/slices/view.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
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
 * right-aligned control cluster (info icon, view switcher, today, prev/next).
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
  const isSidebarOpen = useAppSelector(selectIsSidebarOpen);
  const dispatch = useAppDispatch();

  return (
    <div className="relative flex h-12 w-full shrink-0 items-center justify-between text-text-light">
      {!isSidebarOpen ? (
        <TooltipWrapper
          description="Open sidebar"
          onClick={() => dispatch(viewSlice.actions.toggleSidebar())}
          shortcut="["
        >
          <span className="flex h-6 w-6 items-center justify-center">
            <SidebarIcon color={theme.color.text.lightInactive} size={21} />
          </span>
        </TooltipWrapper>
      ) : null}

      <h1 className="pl-5 text-text-light" aria-live="polite">
        <Text size="xl">{label}</Text>
      </h1>

      <div className="z-2 flex items-center gap-3 pr-5">
        <HeaderInfoIcon />
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
