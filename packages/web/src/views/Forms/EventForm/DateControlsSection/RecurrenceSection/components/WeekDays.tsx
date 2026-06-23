import type React from "react";
import { Text } from "@web/components/Text/Text";
import { WEEKDAYS } from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/constants/recurrence.constants";
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
    <div className="mb-1 flex w-full basis-full items-center gap-2 p-0">
      <Text size="l">On: </Text>

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
    </div>
  );
};
