import React from "react";
import { StyledWeekDay } from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/styled";

export interface WeekDayProps {
  day: string;
  bgColor: string;
  onClick: () => void;
  selected: boolean;
}

export const WeekDay = ({ day, bgColor, onClick, selected }: WeekDayProps) => {
  return (
    <StyledWeekDay
      bgColor={bgColor}
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
      selected={selected}
    >
      {day.charAt(0).toUpperCase()}
    </StyledWeekDay>
  );
};
