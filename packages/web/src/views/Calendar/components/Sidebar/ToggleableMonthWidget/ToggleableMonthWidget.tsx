import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import { DatePicker } from "@web/components/DatePicker";
import { ColorNames } from "@web/common/types/styles";

import { Props as ToggleArrowProps } from "../ToggleArrow/ToggleArrow";
import { Styled, StyledMonthName, StyledToggleArrow } from "./styled";

export interface Props extends Omit<ToggleArrowProps, "onToggle"> {
  monthsShown?: number;
  setIsToggled: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ToggleableMonthWidget: React.FC<Props> = ({
  monthsShown,
  isToggled,
  setIsToggled,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  useEffect(() => {
    setIsToggled(!!monthsShown);
  }, [monthsShown]);

  const selectedDateLabel = dayjs(selectedDate).format("MMM DD");
  const temporarilyDisableToggle = true;

  return (
    <Styled>
      {/* <StyledToggleArrow
        isToggled={isToggled}
        onToggle={() => setIsToggled((toggle) => !toggle)}
      /> */}
      {temporarilyDisableToggle ? (
        <DatePicker
          onChange={(date) => {
            console.log(date);
            setSelectedDate(date);
          }}
          shouldCloseOnSelect={false}
          selected={selectedDate}
          defaultOpen
          animationOnToggle={false}
          inline
          calendarClassName="sidebarDatePicker"
          withTodayButton={false}
          monthsShown={monthsShown}
        />
      ) : (
        <StyledMonthName size={25} colorName={ColorNames.WHITE_1}>
          {selectedDateLabel}
        </StyledMonthName>
      )}
    </Styled>
  );
};
