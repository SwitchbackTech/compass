import React, { FC } from "react";
import { Dayjs } from "dayjs";
import { ColorNames } from "@core/types/color.types";
import { getAlphaColor, getColor } from "@core/util/color.utils";
import { useAppDispatch, useAppSelector } from "@web/store/store.hooks";
import { AlignItems, JustifyContent } from "@web/components/Flex/styled";
import { SpaceCharacter } from "@web/components/SpaceCharacter";
import { Text } from "@web/components/Text";
import { TodayButton } from "@web/views/Calendar/components/TodayButton";
import { getWeekDayLabel } from "@web/common/utils/event.util";
import { WEEK_DAYS_HEIGHT } from "@web/views/Calendar/layout.constants";
import { RootProps } from "@web/views/Calendar/calendarView.types";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { selectDraftId } from "@web/ducks/events/selectors/draft.selectors";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { selectIsRightSidebarOpen } from "@web/ducks/settings/selectors/settings.selectors";
import { Util_Scroll } from "@web/views/Calendar/hooks/grid/useScroll";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import { HamburgerIcon } from "@web/components/Icons/HamburgerIcon";

import {
  StyledHeaderRow,
  StyledNavigationButtons,
  ArrowNavigationButton,
  StyledWeekDaysFlex,
  StyledWeekDayFlex,
  StyledLeftGroup,
  StyledRightGroup,
  StyledHeaderLabel,
  StyledNavigationArrows,
} from "./styled";

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

  const { isDrafting } = useAppSelector(selectDraftId);
  const isRightSidebarOpen = useAppSelector(selectIsRightSidebarOpen);

  const { scrollToNow } = scrollUtil;

  const onSectionClick = () => {
    if (isDrafting) {
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
            <Text colorName={ColorNames.WHITE_1} size={40}>
              {weekProps.component.startOfView.format("MMMM")}
            </Text>

            <SpaceCharacter />

            <Text colorName={ColorNames.GREY_4} size={38}>
              {weekProps.component.startOfView.format("YYYY")}
            </Text>
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
                  colorName={ColorNames.GREY_4}
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
                  colorName={ColorNames.GREY_4}
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
            <HamburgerIcon />
          </TooltipWrapper>
        </StyledRightGroup>
      </StyledHeaderRow>

      <StyledWeekDaysFlex>
        {weekProps.component.weekDays.map((day) => {
          const isDayInCurrentWeek = today.week() === weekProps.component.week;
          const isToday =
            isDayInCurrentWeek && today.format("DD") === day.format("DD");

          let weekDayTextColor = isToday
            ? getColor(ColorNames.TEAL_3)
            : getAlphaColor(ColorNames.WHITE_1, 0.72);

          let dayNumberToDisplay = day.format("D");

          dayNumberToDisplay =
            day.format("MM") !== weekProps.component.startOfView.format("MM") &&
            day.format("D") === "1"
              ? day.format("MMM D")
              : dayNumberToDisplay;

          if (day.isBefore(rootProps.component.today, "day")) {
            weekDayTextColor = getAlphaColor(ColorNames.WHITE_1, 0.55);
          }

          return (
            <StyledWeekDayFlex
              justifyContent={JustifyContent.CENTER}
              key={getWeekDayLabel(day)}
              alignItems={AlignItems.FLEX_END}
              title={getWeekDayLabel(day)}
              color={weekDayTextColor}
            >
              <Text lineHeight={WEEK_DAYS_HEIGHT} size={WEEK_DAYS_HEIGHT}>
                {dayNumberToDisplay}
              </Text>
              <SpaceCharacter />
              <Text size={12}>{day.format("ddd")}</Text>
            </StyledWeekDayFlex>
          );
        })}
      </StyledWeekDaysFlex>
    </>
  );
};
