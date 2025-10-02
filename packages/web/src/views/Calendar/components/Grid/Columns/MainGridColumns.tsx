import React, { FC } from "react";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { Dayjs } from "@core/util/date/dayjs";
import { theme } from "@web/common/styles/theme";
import { NowLine } from "@web/views/Calendar/components/NowLine";
import { TimesColumn } from "./TimesColumn";
import { StyledGridCol, StyledGridCols } from "./styled";

interface Props {
  isCurrentWeek: boolean;
  today: Dayjs;
  week: number;
  weekDays: Dayjs[];
}

export const MainGridColumns: FC<Props> = ({
  isCurrentWeek,
  today,
  week,
  weekDays,
}) => {
  const todayIndex = today.day();
  const pastDayColor = theme.color.bg.secondary;

  const _getColumnColor = (dayIndex: number) => {
    const isPastDay = todayIndex > dayIndex;
    if (isPastDay) {
      return pastDayColor;
    }
    return null;
  };

  const _getColumnColors = () => {
    const daysInView = 7;
    const currentWeek = today.week();

    const isPastWeek = week < currentWeek;
    if (isPastWeek) {
      return Array(daysInView).fill(pastDayColor) as string[];
    }

    const isFutureWeek = week > currentWeek;
    if (isFutureWeek) {
      return Array(daysInView).fill(null) as null[];
    }

    //this week
    const colorsByIdx = weekDays.map((_, i) => _getColumnColor(i));
    return colorsByIdx;
  };

  const colColors = _getColumnColors();

  return (
    <>
      <TimesColumn />
      <StyledGridCols>
        {isCurrentWeek && <NowLine width={100} />}

        {weekDays.map((day, i) => (
          <StyledGridCol
            color={colColors[i]!}
            key={day.format(YEAR_MONTH_DAY_FORMAT)}
          />
        ))}
      </StyledGridCols>
    </>
  );
};
