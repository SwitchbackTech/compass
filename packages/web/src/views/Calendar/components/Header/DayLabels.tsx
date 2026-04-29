import { type FC } from "react";
import styled from "styled-components";
import { type Dayjs } from "@core/util/date/dayjs";
import { theme } from "@web/common/styles/theme";
import { getWeekDayLabel } from "@web/common/utils/event/event.util";
import { Text } from "@web/components/Text";
import {
  EVENT_WIDTH_MINIMUM,
  GRID_MARGIN_LEFT,
  SCROLLBAR_WIDTH,
} from "../../layout.constants";

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
    <StyledDayLabels>
      <div aria-hidden="true" />
      {weekDays.map((day) => {
        const dayNumber = getDayNumber(day);
        const { isToday, color } = getColor(day);

        return (
          <StyledDayLabel
            key={getWeekDayLabel(day)}
            style={{ color }}
            title={getWeekDayLabel(day)}
          >
            <Text className="week-day-number" withGradient={isToday}>
              {dayNumber}
            </Text>
            <Text className="week-day-name">{day.format("ddd")}</Text>
          </StyledDayLabel>
        );
      })}
      <div aria-hidden="true" />
    </StyledDayLabels>
  );
};

const StyledDayLabels = styled.div`
  display: grid;
  grid-template-columns:
    ${GRID_MARGIN_LEFT}px repeat(7, minmax(${EVENT_WIDTH_MINIMUM}px, 1fr))
    ${SCROLLBAR_WIDTH}px;
  margin-top: 10px;
  width: 100%;

  .week-day-number {
    font-size: ${({ theme }) =>
      `clamp(${theme.text.size.xl}, 2.7cqw, ${theme.text.size.xxl})`};
    line-height: 1;
  }

  .week-day-name {
    font-size: ${({ theme }) =>
      `clamp(${theme.text.size.m}, 2cqw, ${theme.text.size.l})`};
    line-height: 1;
  }
`;

const StyledDayLabel = styled.div`
  align-items: end;
  display: flex;
  gap: 4px;
  justify-content: center;
  min-width: ${EVENT_WIDTH_MINIMUM}px;
`;
