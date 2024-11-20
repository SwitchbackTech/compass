import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import weekPlugin from "dayjs/plugin/weekOfYear";
import { DatePicker } from "@web/components/DatePicker";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { theme } from "@web/common/styles/theme";

import { Styled } from "./styled";

dayjs.extend(weekPlugin);

export interface Props {
  isCurrentWeek: boolean;
  monthsShown?: number;
  setStartOfView: WeekProps["state"]["setStartOfView"];
  weekStart: WeekProps["component"]["startOfView"];
}

export const MonthTab: React.FC<Props> = ({
  isCurrentWeek,
  monthsShown,
  setStartOfView,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  useEffect(() => {
    if (isCurrentWeek) {
      setSelectedDate(null);
    }
  }, [isCurrentWeek]);

  return (
    <Styled role="dialog" data-testid="Month Widget">
      <DatePicker
        animationOnToggle={false}
        bgColor={theme.color.text.light}
        calendarClassName="sidebarDatePicker"
        inline
        isOpen={true}
        monthsShown={monthsShown}
        onChange={(date) => {
          setSelectedDate(date);
          setStartOfView(dayjs(date).startOf("week"));
        }}
        selected={selectedDate}
        shouldCloseOnSelect={false}
        view="widget"
        withTodayButton={true}
      />
    </Styled>
  );
};
