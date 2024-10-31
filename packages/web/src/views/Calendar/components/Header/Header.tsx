import React, { FC } from "react";
import { Dayjs } from "dayjs";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { AlignItems } from "@web/components/Flex/styled";
import { SpaceCharacter } from "@web/components/SpaceCharacter";
import { Text } from "@web/components/Text";
import { TodayButton } from "@web/views/Calendar/components/TodayButton";
import { RootProps } from "@web/views/Calendar/calendarView.types";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { selectIsRightSidebarOpen } from "@web/ducks/settings/selectors/settings.selectors";
import { Util_Scroll } from "@web/views/Calendar/hooks/grid/useScroll";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { StyledListIcon } from "@web/components/Icons/List";
import { isEventFormOpen } from "@web/common/utils";

import {
  StyledHeaderRow,
  StyledNavigationButtons,
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

  const isRightSidebarOpen = useAppSelector(selectIsRightSidebarOpen);
  const { startOfView } = weekProps.component;

  const onSectionClick = () => {
    if (isEventFormOpen()) {
      dispatch(draftSlice.actions.discard());
      return;
    }
  };

  const onTodayClick = () => {
    if (!weekProps.component.isCurrentWeek) {
      weekProps.util.goToToday();
    }
    scrollToNow();
  };

  return (
    <>
      <StyledHeaderRow
        alignItems={AlignItems.FLEX_START}
        onClick={onSectionClick}
      >
        <StyledLeftGroup>
          <StyledHeaderLabel aria-level={1} role="heading">
            <Text size={40}>{startOfView.format("MMMM")}</Text>

            <SpaceCharacter />

            <Text size={38}>{startOfView.format("YYYY")}</Text>
          </StyledHeaderLabel>

          <StyledNavigationButtons>
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
                  size={35}
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
                  size={35}
                  title="next week"
                >
                  {">"}
                </ArrowNavigationButton>
              </TooltipWrapper>
            </StyledNavigationArrows>
          </StyledNavigationButtons>
        </StyledLeftGroup>

        <StyledRightGroup>
          <TooltipWrapper
            description={`${isRightSidebarOpen ? "Collapse" : "Open"} settings`}
            onClick={() => {
              dispatch(settingsSlice.actions.toggleRightSidebar());
            }}
            shortcut="]"
          >
            <StyledListIcon size={28} />
          </TooltipWrapper>
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
