import React, { useState } from "react";
import dayjs from "dayjs";
import { Text } from "@web/components/Text";
import { DatePicker } from "@web/components/DatePicker";
import { AlignItems } from "@web/components/Flex/styled";
import { MONTH_YEAR_COMPACT_FORMAT } from "@web/common/constants/dates";

import { StyledDateFlex } from "../DateTimeSection/styled";

interface Props {
  isPickerOpen: boolean;
  setIsPickerOpen: (arg0: boolean) => void;
}

export const MonthPicker: React.FC<Props> = ({
  isPickerOpen,
  setIsPickerOpen,
}) => {
  const [startMonth, setStartMonth] = useState(new Date());

  const closePicker = () => {
    setIsPickerOpen(false);
  };

  const openPicker = () => {
    setIsPickerOpen(true);
  };

  const onSelectMonth = (date: Date | null | [Date | null, Date | null]) => {
    console.log(date);
    setStartMonth(date as Date);
  };

  return (
    <StyledDateFlex
      alignItems={AlignItems.CENTER}
      onMouseDown={(e) => {
        isPickerOpen && closePicker();
        e.stopPropagation();
      }}
    >
      {isPickerOpen ? (
        <DatePicker
          dateFormat="M/yyyy"
          defaultOpen
          onCalendarClose={closePicker}
          onChange={(date) => setStartMonth(date)}
          onSelect={onSelectMonth}
          selected={startMonth}
          showMonthYearPicker
        />
      ) : (
        <div>
          <Text onClick={openPicker} withUnderline>
            {dayjs(startMonth).format(MONTH_YEAR_COMPACT_FORMAT)}
          </Text>
        </div>
      )}
    </StyledDateFlex>
  );
};
