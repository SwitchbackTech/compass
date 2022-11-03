import React, { useState } from "react";
import dayjs from "dayjs";
import weekPlugin from "dayjs/plugin/weekOfYear";
import { DatePicker } from "@web/components/DatePicker";
import { ColorNames } from "@core/types/color.types";
import { getColor } from "@core/util/color.utils";

import { Props as ToggleArrowProps } from "../ToggleArrow/ToggleArrow";
import { Styled, StyledMonthName } from "./styled";

dayjs.extend(weekPlugin);
export interface Props extends Omit<ToggleArrowProps, "onToggle"> {
  monthsShown?: number;
  setWeek: React.Dispatch<React.SetStateAction<number>>;
}

export const ToggleableMonthWidget: React.FC<Props> = ({
  monthsShown,
  setWeek,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  const selectedDateLabel = dayjs(selectedDate).format("MMM DD");
  const temporarilyDisableToggle = true;

  return (
    <Styled role="dialog" title="Month Overview">
      {temporarilyDisableToggle ? (
        <DatePicker
          bgColor={getColor(ColorNames.GREY_3)}
          calendarClassName="sidebarDatePicker"
          animationOnToggle={false}
          inline
          isOpen={true}
          onChange={(date) => {
            const week = dayjs(date).week();
            setWeek(week);
            setSelectedDate(date);
          }}
          shouldCloseOnSelect={false}
          selected={selectedDate}
          withTodayButton={true}
          monthsShown={monthsShown}
        />
      ) : (
        <StyledMonthName size={19} colorName={ColorNames.WHITE_1}>
          {selectedDateLabel}
        </StyledMonthName>
      )}
    </Styled>
  );
};
