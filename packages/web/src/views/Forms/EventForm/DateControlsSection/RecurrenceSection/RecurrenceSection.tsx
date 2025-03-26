import React from "react";
import { CaretDown, CaretUp } from "@phosphor-icons/react";
import { StyledText } from "@web/components/Text/styled";
import {
  StyledCaretButton,
  StyledCaretInputContainer,
  StyledRecurrenceRepeatCountSelect,
  StyledRecurrenceSection,
  StyledRepeatCountInput,
  StyledWeekDay,
  StyledWeekDayContainer,
  StyledWeekDaysContainer,
} from "./styled";

const weekDays = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export const RecurrenceSection = ({ bgColor }: { bgColor: string }) => {
  return (
    <StyledRecurrenceSection>
      <RecurrenceRepeatCountSelect bgColor={bgColor} />
      <WeekDays bgColor={bgColor} />
    </StyledRecurrenceSection>
  );
};

export const RecurrenceRepeatCountSelect = ({
  bgColor,
}: {
  bgColor: string;
}) => {
  return (
    <StyledRecurrenceRepeatCountSelect>
      <StyledText size="l">Repeat every</StyledText>
      <StyledRepeatCountInput
        bgColor={bgColor}
        type="number"
        max={12}
        min={1}
      />
      <CaretInput />
    </StyledRecurrenceRepeatCountSelect>
  );
};

const CaretInput = () => {
  return (
    <StyledCaretInputContainer>
      <StyledCaretButton
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <CaretUp size={14} />
      </StyledCaretButton>
      <StyledCaretButton
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <CaretDown size={14} />
      </StyledCaretButton>
    </StyledCaretInputContainer>
  );
};

const WeekDays = ({ bgColor }: { bgColor: string }) => {
  return (
    <StyledWeekDaysContainer>
      {weekDays.map((day) => (
        <StyledWeekDayContainer key={day}>
          <WeekDay day={day} bgColor={bgColor} />
        </StyledWeekDayContainer>
      ))}
    </StyledWeekDaysContainer>
  );
};

const WeekDay = ({ day, bgColor }: { day: string; bgColor: string }) => {
  return (
    <StyledWeekDay bgColor={bgColor} selected={day === "monday"}>
      {day.charAt(0).toUpperCase()}
    </StyledWeekDay>
  );
};
