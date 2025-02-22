import dayjs from "dayjs";
import weekPlugin from "dayjs/plugin/weekOfYear";
import React, { FC, useEffect, useState } from "react";
import { ID_DATEPICKER_SIDEBAR } from "@web/common/constants/web.constants";
import { DatePicker } from "@web/components/DatePicker";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { MonthPickerContainer } from "./../styled";

dayjs.extend(weekPlugin);

interface Props {
  isCurrentWeek: boolean;
  monthsShown?: number;
  setStartOfView: WeekProps["state"]["setStartOfView"];
  weekStart: WeekProps["component"]["startOfView"];
}

export const SidebarMonthPicker: FC<Props> = ({
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
    <MonthPickerContainer role="dialog" data-testid="Month Widget">
      <DatePicker
        animationOnToggle={false}
        calendarClassName={ID_DATEPICKER_SIDEBAR}
        inline
        isOpen={true}
        monthsShown={monthsShown}
        onChange={(date) => {
          setSelectedDate(date);
          setStartOfView(dayjs(date).startOf("week"));
        }}
        selected={selectedDate}
        shouldCloseOnSelect={false}
        view="sidebar"
        withTodayButton={true}
      />
    </MonthPickerContainer>
  );
};
