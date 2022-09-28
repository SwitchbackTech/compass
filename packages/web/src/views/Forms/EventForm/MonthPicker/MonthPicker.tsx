import React, { useState } from "react";
import dayjs from "dayjs";
import { Text } from "@web/components/Text";
import { DatePicker } from "@web/components/DatePicker";
import { AlignItems } from "@web/components/Flex/styled";
import { MONTH_YEAR_COMPACT_FORMAT } from "@web/common/constants/date.constants";
import { toUTCOffset } from "@web/common/utils/web.date.util";

import { StyledDateFlex } from "../DateTimeSection/styled";
import { SetEventFormField } from "../types";

interface Props {
  isPickerOpen: boolean;
  setIsPickerOpen: (arg0: boolean) => void;
  startMonth: string;
  onSetEventField: SetEventFormField;
}

export const MonthPicker: React.FC<Props> = ({
  isPickerOpen,
  setIsPickerOpen,
  startMonth: _startMonth,
  onSetEventField,
}) => {
  const startMonthDefault = _startMonth ? new Date(_startMonth) : new Date();
  const [startMonth, setStartMonth] = useState(startMonthDefault);
  const startMonthStr = dayjs(startMonth).format(MONTH_YEAR_COMPACT_FORMAT);

  const closePicker = () => {
    setIsPickerOpen(false);
  };

  const openPicker = () => {
    setIsPickerOpen(true);
  };

  const onSelectMonth = (date: Date | null) => {
    setStartMonth(date);
    const dateString = toUTCOffset(date);
    onSetEventField("startDate", dateString);
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
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
        >
          <DatePicker
            autoFocus
            dateFormat="M/yyyy"
            defaultOpen
            onCalendarClose={closePicker}
            onChange={closePicker}
            // onChange={() => null}
            onSelect={onSelectMonth}
            selected={startMonth}
            showMonthYearPicker
          />
        </div>
      ) : (
        <div>
          <Text onClick={openPicker} withUnderline>
            {startMonthStr}
          </Text>
        </div>
      )}
    </StyledDateFlex>
  );
};
