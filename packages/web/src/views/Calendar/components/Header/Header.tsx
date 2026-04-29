import { type FC } from "react";
import dayjs from "@core/util/date/dayjs";
import { theme } from "@web/common/styles/theme";
import { getCalendarHeadingLabel } from "@web/common/utils/datetime/web.date.util";
import { HeaderInfoIcon } from "@web/components/HeaderInfoIcon/HeaderInfoIcon";
import { SidebarIcon } from "@web/components/Icons/Sidebar";
import { SelectView } from "@web/components/SelectView/SelectView";
import { Text } from "@web/components/Text";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { selectIsSidebarOpen } from "@web/ducks/events/selectors/view.selectors";
import { viewSlice } from "@web/ducks/events/slices/view.slice";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { type Util_Scroll } from "../../hooks/grid/useScroll";
import { type WeekProps } from "../../hooks/useWeek";
import { TodayButton } from "../TodayButton/TodayButton";

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
      <TooltipWrapper
        description={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
        onClick={() => dispatch(viewSlice.actions.toggleSidebar())}
        shortcut="["
      >
        <SidebarIcon
          color={
            isSidebarOpen
              ? theme.color.text.light
              : theme.color.text.lightInactive
          }
        />
      </TooltipWrapper>
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
              <TooltipWrapper
                onClick={() => weekProps.util.decrementWeek()}
                shortcut="J"
              >
                <Text
                  className="flex h-[30px] w-[30px] select-none items-center justify-center transition-[filter] duration-[350ms] ease-out hover:rounded-full hover:brightness-[1.6]"
                  cursor="pointer"
                  role="navigation"
                  size="xxl"
                  title="previous week"
                >
                  {"<"}
                </Text>
              </TooltipWrapper>

              <TooltipWrapper
                onClick={() => weekProps.util.incrementWeek()}
                shortcut="K"
              >
                <Text
                  className="flex h-[30px] w-[30px] select-none items-center justify-center transition-[filter] duration-[350ms] ease-out hover:rounded-full hover:brightness-[1.6]"
                  cursor="pointer"
                  role="navigation"
                  size="xxl"
                  title="next week"
                >
                  {">"}
                </Text>
              </TooltipWrapper>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
