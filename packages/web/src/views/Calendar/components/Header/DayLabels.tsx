import { Dayjs } from "dayjs";
import React, { FC } from "react";
import { theme } from "@web/common/styles/theme";
import { getWeekDayLabel } from "@web/common/utils/event/event.util";
import { AlignItems, JustifyContent } from "@web/components/Flex/styled";
import { SpaceCharacter } from "@web/components/SpaceCharacter";
import { Text } from "@web/components/Text";
import { StyledWeekDayFlex, StyledWeekDaysFlex } from "./styled";

interface Props {
  today: Dayjs;
  startOfView: Dayjs;
  week: number;
  weekDays: Dayjs[];
}

export const DayLabels: FC<Props> = ({
  startOfView,
  today,
  week,
  weekDays,
}) => {
  const getColor = (day: Dayjs) => {
    const isCurrentWeek = today.week() === week;
    const isToday = isCurrentWeek && today.format("DD") === day.format("DD");
    const color = day.isBefore(today, "day")
      ? theme.color.text.lightInactive
      : isToday
        ? theme.color.text.accent
        : theme.color.text.light;

    return { isToday, color };
  };

  const getDayNumber = (day: Dayjs) => {
    let dayNumber = day.format("D");

    dayNumber =
      day.format("MM") !== startOfView.format("MM") && day.format("D") === "1"
        ? day.format("MMM D")
        : dayNumber;

    return dayNumber;
  };

  return (
    <StyledWeekDaysFlex>
      {weekDays.map((day) => {
        const dayNumber = getDayNumber(day);
        const { isToday, color } = getColor(day);

        return (
          <StyledWeekDayFlex
            justifyContent={JustifyContent.CENTER}
            key={getWeekDayLabel(day)}
            alignItems={AlignItems.FLEX_END}
            title={getWeekDayLabel(day)}
            color={color}
          >
            <Text size="xxl" withGradient={isToday}>
              {dayNumber}
            </Text>
            <SpaceCharacter />
            <Text size="l">{day.format("ddd")}</Text>
          </StyledWeekDayFlex>
        );
      })}
    </StyledWeekDaysFlex>
  );
};
