import React, { FC } from "react";
import { Dayjs } from "dayjs";
import { ColorNames } from "@core/types/color.types";
import { getColor, getAlphaColor } from "@core/util/color.utils";
import { Text } from "@web/components/Text";
import { getWeekDayLabel } from "@web/common/utils/event.util";
import { JustifyContent, AlignItems } from "@web/components/Flex/styled";
import { SpaceCharacter } from "@web/components/SpaceCharacter";

import { RootProps } from "../../calendarView.types";
import { WEEK_DAYS_HEIGHT } from "../../layout.constants";
import { StyledWeekDaysFlex, StyledWeekDayFlex } from "./styled";

interface Props {
  rootProps: RootProps;
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
  return (
    <StyledWeekDaysFlex>
      {weekDays.map((day) => {
        const isDayInCurrentWeek = today.week() === week;
        const isToday =
          isDayInCurrentWeek && today.format("DD") === day.format("DD");

        let weekDayTextColor = isToday
          ? getColor(ColorNames.TEAL_3)
          : getAlphaColor(ColorNames.WHITE_1, 0.72);

        let dayNumberToDisplay = day.format("D");

        dayNumberToDisplay =
          day.format("MM") !== startOfView.format("MM") &&
          day.format("D") === "1"
            ? day.format("MMM D")
            : dayNumberToDisplay;

        if (day.isBefore(today, "day")) {
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
  );
};
