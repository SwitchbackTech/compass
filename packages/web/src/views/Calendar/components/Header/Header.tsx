import React, { FC } from "react";
import { Dayjs } from "dayjs";
import { ColorNames } from "@core/types/color.types";
import { getAlphaColor, getColor } from "@core/util/color.utils";
import { AlignItems, JustifyContent } from "@web/components/Flex/styled";
import { SpaceCharacter } from "@web/components/SpaceCharacter";
import { Text } from "@web/components/Text";
import { TodayButtonPopover } from "@web/views/Calendar/components/TodayButtonPopover";
import { getWeekDayLabel } from "@web/common/utils/event.util";
import { WEEK_DAYS_HEIGHT } from "@web/views/Calendar/layout.constants";
import { RootProps } from "@web/views/Calendar/calendarView.types";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { selectDraftId } from "@web/ducks/events/event.selectors";
import { draftSlice } from "@web/ducks/events/event.slice";
import { useDispatch, useSelector } from "react-redux";

import {
  StyledHeaderFlex,
  StyledNavigationButtons,
  ArrowNavigationButton,
  StyledWeekDaysFlex,
  StyledWeekDayFlex,
} from "./styled";

interface Props {
  rootProps: RootProps;
  today: Dayjs;
  weekProps: WeekProps;
}

export const Header: FC<Props> = ({ rootProps, today, weekProps }) => {
  const dispatch = useDispatch();
  const { isDrafting } = useSelector(selectDraftId);

  const onSectionClick = () => {
    if (isDrafting) {
      dispatch(draftSlice.actions.discard());
      return;
    }
  };

  return (
    <>
      <StyledHeaderFlex alignItems={AlignItems.CENTER} onClick={onSectionClick}>
        <div role="heading" aria-level={1}>
          <Text colorName={ColorNames.WHITE_1} size={40}>
            {weekProps.component.dayjsBasedOnWeekDay.format("MMMM")}
          </Text>

          <SpaceCharacter />

          <Text colorName={ColorNames.GREY_4} size={38}>
            {weekProps.component.dayjsBasedOnWeekDay.format("YYYY")}
          </Text>
        </div>

        <StyledNavigationButtons>
          <ArrowNavigationButton
            colorName={ColorNames.WHITE_2}
            cursor="pointer"
            onClick={() =>
              weekProps.state.setWeek((actualWeek) => actualWeek - 1)
            }
            role="navigation"
            size={35}
            title="previous week"
          >
            {"<"}
          </ArrowNavigationButton>

          <ArrowNavigationButton
            colorName={ColorNames.GREY_5}
            cursor="pointer"
            onClick={() =>
              weekProps.state.setWeek((actualWeek) => +actualWeek + 1)
            }
            role="navigation"
            size={35}
            title="next week"
          >
            {">"}
          </ArrowNavigationButton>

          <TodayButtonPopover
            onClick={() => weekProps.state.setWeek(today.week())}
            today={today}
            weekInFocus={weekProps.component.week}
          />
        </StyledNavigationButtons>
      </StyledHeaderFlex>

      <StyledWeekDaysFlex>
        {weekProps.component.weekDays.map((day, i) => {
          const isDayInCurrentWeek = today.week() === weekProps.component.week;
          const isToday =
            isDayInCurrentWeek && today.format("DD") === day.format("DD");

          let weekDayTextColor = isToday
            ? getColor(ColorNames.TEAL_3)
            : getAlphaColor(ColorNames.WHITE_1, 0.72);

          let dayNumberToDisplay = day.format("D");

          dayNumberToDisplay =
            day.format("MM") !==
              weekProps.component.startOfSelectedWeekDay.format("MM") &&
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
              // width={weekProps.util.getWidthByIndex(i)}
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
