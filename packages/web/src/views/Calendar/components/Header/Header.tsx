import React, { FC } from "react";
import dayjs, { Dayjs } from "dayjs";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { AlignItems } from "@web/components/Flex/styled";
import { Text } from "@web/components/Text";
import { TodayButton } from "@web/views/Calendar/components/TodayButton";
import { RootProps } from "@web/views/Calendar/calendarView.types";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { Util_Scroll } from "@web/views/Calendar/hooks/grid/useScroll";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { SidebarIcon } from "@web/components/Icons/Sidebar";
import { selectIsSidebarOpen } from "@web/ducks/events/selectors/view.selectors";
import { viewSlice } from "@web/ducks/events/slices/view.slice";
import { getCalendarHeadingLabel } from "@web/common/utils/web.date.util";

import {
  StyledHeaderRow,
  StyledNavigationGroup,
  ArrowNavigationButton,
  StyledLeftGroup,
  StyledRightGroup,
  StyledHeaderLabel,
  StyledNavigationArrows,
} from "./styled";
import { DayLabels } from "./DayLabels";

interface Props {
  rootProps: RootProps;
  scrollUtil: Util_Scroll;
  today: Dayjs;
  weekProps: WeekProps;
}

export const Header: FC<Props> = ({
  rootProps,
  scrollUtil,
  today,
  weekProps,
}) => {
  const dispatch = useAppDispatch();
  const { scrollToNow } = scrollUtil;

  const { startOfView, endOfView } = weekProps.component;
  const isSidebarOpen = useAppSelector(selectIsSidebarOpen);

  const onTodayClick = () => {
    if (!weekProps.component.isCurrentWeek) {
      weekProps.util.goToToday();
    }
    scrollToNow();
  };

  const headerLabel = getCalendarHeadingLabel(startOfView, endOfView, dayjs());

  return (
    <>
      <StyledHeaderRow alignItems={AlignItems.BASELINE}>
        <TooltipWrapper
          description={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
          onClick={() => dispatch(viewSlice.actions.toggleSidebar())}
          shortcut="["
        >
          <SidebarIcon size={25} isFocused={isSidebarOpen} />
        </TooltipWrapper>
        <StyledLeftGroup>
          <StyledHeaderLabel aria-level={1} role="heading">
            <Text size="4xl">{headerLabel}</Text>
          </StyledHeaderLabel>
        </StyledLeftGroup>

        <StyledRightGroup>
          <StyledNavigationGroup>
            <TooltipWrapper
              description={today.format("dddd, MMMM D")}
              onClick={onTodayClick}
              shortcut="T"
            >
              <TodayButton />
            </TooltipWrapper>

            <StyledNavigationArrows>
              <TooltipWrapper
                onClick={() => weekProps.util.decrementWeek()}
                shortcut="J"
              >
                <ArrowNavigationButton
                  cursor="pointer"
                  role="navigation"
                  size="xxl"
                  title="previous week"
                >
                  {"<"}
                </ArrowNavigationButton>
              </TooltipWrapper>

              <TooltipWrapper
                onClick={() => weekProps.util.incrementWeek()}
                shortcut="K"
              >
                <ArrowNavigationButton
                  cursor="pointer"
                  role="navigation"
                  size="xxl"
                  title="next week"
                >
                  {">"}
                </ArrowNavigationButton>
              </TooltipWrapper>
            </StyledNavigationArrows>
          </StyledNavigationGroup>
        </StyledRightGroup>
      </StyledHeaderRow>

      <DayLabels
        rootProps={rootProps}
        startOfView={weekProps.component.startOfView}
        today={today}
        week={weekProps.component.week}
        weekDays={weekProps.component.weekDays}
      />
    </>
  );
};
