import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import weekPlugin from "dayjs/plugin/weekOfYear";
import { DatePicker } from "@web/components/DatePicker";
import { ColorNames } from "@core/types/color.types";
import { getColor } from "@core/util/color.utils";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";

import { Props as ToggleArrowProps } from "../ToggleArrow/ToggleArrow";
import { Styled, StyledMonthName } from "./styled";

dayjs.extend(weekPlugin);
export interface Props extends Omit<ToggleArrowProps, "onToggle"> {
  isCurrentWeek: boolean;
  monthsShown?: number;
  setStartOfView: WeekProps["state"]["setStartOfView"];
  weekStart: WeekProps["component"]["startOfView"];
}

export const ToggleableMonthWidget: React.FC<Props> = ({
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

  const selectedDateLabel = dayjs(selectedDate).format("MMM DD");
  const temporarilyDisableToggle = true;

  return (
    <Styled role="dialog" data-testid="Month Widget">
      {temporarilyDisableToggle ? (
        <DatePicker
          animationOnToggle={false}
          bgColor={getColor(ColorNames.GREY_3)}
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
      ) : (
        <StyledMonthName size={19} colorName={ColorNames.WHITE_1}>
          {selectedDateLabel}
        </StyledMonthName>
      )}
    </Styled>
  );
};
