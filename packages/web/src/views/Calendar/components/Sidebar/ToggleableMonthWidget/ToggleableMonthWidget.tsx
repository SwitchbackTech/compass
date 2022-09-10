import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import weekPlugin from "dayjs/plugin/weekOfYear";
import { DatePicker } from "@web/components/DatePicker";
import { ColorNames } from "@core/constants/colors";

import { Props as ToggleArrowProps } from "../ToggleArrow/ToggleArrow";
import { Styled, StyledMonthName, StyledToggleArrow } from "./styled";

dayjs.extend(weekPlugin);
export interface Props extends Omit<ToggleArrowProps, "onToggle"> {
  monthsShown?: number;
  setIsToggled: React.Dispatch<React.SetStateAction<boolean>>;
  setWeek: React.Dispatch<React.SetStateAction<number>>;
}

export const ToggleableMonthWidget: React.FC<Props> = ({
  monthsShown,
  isToggled,
  setIsToggled,
  setWeek,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  // useEffect(() => {
  //   setIsToggled(!!monthsShown);
  // }, [monthsShown]);

  const selectedDateLabel = dayjs(selectedDate).format("MMM DD");
  const temporarilyDisableToggle = true;

  return (
    <Styled role="dialog" title="month widget">
      {/* <StyledToggleArrow
        isToggled={isToggled}
        onToggle={() => setIsToggled((toggle) => !toggle)}
      /> */}
      {temporarilyDisableToggle ? (
        <DatePicker
          onChange={(date) => {
            const week = dayjs(date).week();
            setWeek(week);
            setSelectedDate(date);
          }}
          shouldCloseOnSelect={false}
          selected={selectedDate}
          defaultOpen
          animationOnToggle={false}
          isShown={true}
          inline
          calendarClassName="sidebarDatePicker"
          withTodayButton={false}
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
