import React, { FC } from "react";
import { Dayjs } from "dayjs";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { NowLine } from "@web/views/Calendar/components/NowLine";
import { getColor } from "@core/util/color.utils";
import { ColorNames } from "@core/types/color.types";

import { StyledGridCols, StyledGridCol } from "./styled";
import { TimesColumn } from "./TimesColumn";

interface Props {
  isCurrentWeek: boolean;
  today: Dayjs;
  week: number;
  weekDays: Dayjs[];
}

export const Columns: FC<Props> = ({
  isCurrentWeek,
  today,
  week,
  weekDays,
}) => {
  const todayIndex = today.day();
  const pastDayColor = `${getColor(ColorNames.GREY_3)}30`;

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
            color={colColors[i]}
            key={day.format(YEAR_MONTH_DAY_FORMAT)}
          />
        ))}
      </StyledGridCols>
    </>
  );
};
