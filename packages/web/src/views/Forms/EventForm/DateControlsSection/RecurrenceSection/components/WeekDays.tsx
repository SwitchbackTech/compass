import React from "react";
import { StyledText } from "@web/components/Text/styled";
import { WEEKDAYS } from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/constants/recurrence.constants";
import { StyledRepeatRow } from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/styled";
import { WeekDay } from "./WeekDay";

export interface WeekDaysProps {
  bgColor: string;
  value: typeof WEEKDAYS;
  onChange: (days: typeof WEEKDAYS) => void;
}

export const WeekDays: React.FC<WeekDaysProps> = ({
  bgColor,
  value,
  onChange,
}) => {
  return (
    <StyledRepeatRow>
      <StyledText size="l">On: </StyledText>

      {WEEKDAYS.map((day) => (
        <WeekDay
          key={day}
          day={day}
          bgColor={bgColor}
          onClick={() => {
            if (value.includes(day)) {
              onChange(value.filter((weekday) => weekday !== day));
            } else {
              onChange([...value, day]);
            }
          }}
          selected={value.includes(day)}
        />
      ))}
    </StyledRepeatRow>
  );
};
