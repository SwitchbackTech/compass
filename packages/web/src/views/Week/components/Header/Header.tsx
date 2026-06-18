import { type FC } from "react";
import dayjs from "@core/util/date/dayjs";
import { theme } from "@web/common/styles/theme";
import { getCalendarHeadingLabel } from "@web/common/utils/datetime/web.date.util";
import { HeaderInfoIcon } from "@web/components/HeaderInfoIcon/HeaderInfoIcon";
import { SidebarIcon } from "@web/components/Icons/Sidebar";
import { SelectView } from "@web/components/SelectView/SelectView";
import { Text } from "@web/components/Text/Text";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { selectIsSidebarOpen } from "@web/ducks/events/selectors/view.selectors";
import { viewSlice } from "@web/ducks/events/slices/view.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { type Util_Scroll } from "../../hooks/grid/useScroll";
import { type WeekProps } from "../../hooks/useWeek";
import { TodayButton } from "../TodayButton/TodayButton";

const weekNavButtonClassName =
  "flex h-[30px] w-[30px] cursor-pointer select-none items-center justify-center rounded-full border-0 bg-transparent p-0 text-text-light transition-[filter] duration-[350ms] ease-out hover:brightness-[1.6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50";

interface Props {
  scrollUtil: Util_Scroll;
  weekProps: WeekProps;
}
export const Header: FC<Props> = ({ scrollUtil, weekProps }) => {
  const { scrollToNow } = scrollUtil;

  const isSidebarOpen = useAppSelector(selectIsSidebarOpen);
  const dispatch = useAppDispatch();
  const headerLabel = getCalendarHeadingLabel(
    weekProps.component.startOfView,
    weekProps.component.endOfView,
    dayjs(),
  );

  const onTodayClick = () => {
    if (!weekProps.component.isCurrentWeek) {
      weekProps.util.goToToday();
    }
    scrollToNow();
  };

  return (
    <div className="relative flex h-20 w-full shrink-0 items-baseline justify-between text-text-light">
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
      <div className="z-[2] flex items-center justify-between">
        <h1 className="pl-5 text-text-light">
          <Text size="xl">{headerLabel}</Text>
        </h1>
      </div>
      <div className="z-[2] flex h-full items-center justify-between">
        <HeaderInfoIcon />
        <SelectView />
        <div>
          <div className="mr-5 flex items-center justify-between">
            <TodayButton
              navigateToToday={onTodayClick}
              isToday={weekProps.component.isCurrentWeek}
            />
            <div className="flex items-center gap-3 pl-5">
              <TooltipWrapper shortcut="J">
                <button
                  aria-label="Previous week"
                  className={weekNavButtonClassName}
                  type="button"
                  title="previous week"
                  onClick={() => weekProps.util.decrementWeek()}
                >
                  <Text size="xxl">{"<"}</Text>
                </button>
              </TooltipWrapper>

              <TooltipWrapper shortcut="K">
                <button
                  aria-label="Next week"
                  className={weekNavButtonClassName}
                  type="button"
                  title="next week"
                  onClick={() => weekProps.util.incrementWeek()}
                >
                  <Text size="xxl">{">"}</Text>
                </button>
              </TooltipWrapper>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
