import React, { useEffect, useState } from "react";
import { CaretDown, CaretUp } from "@phosphor-icons/react";
import { Schema_Event } from "@core/types/event.types";
import { SelectOption } from "@web/common/types/component.types";
import { StyledText } from "@web/components/Text/styled";
import {
  WEEKDAYS,
  generateRecurrenceDates,
  getDefaultWeekDay,
} from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/utils";
import {
  StyledCaretButton,
  StyledCaretInputContainer,
  StyledEndsOnDate,
  StyledRecurrenceRepeatCountSelect,
  StyledRecurrenceSection,
  StyledRepeatCountInput,
  StyledWeekDay,
  StyledWeekDayContainer,
  StyledWeekDaysContainer,
} from "./styled";

export interface RecurrenceSectionProps {
  bgColor: string;
  event: Schema_Event;
  startTime: SelectOption<string>;
  endTime: SelectOption<string>;
}

export const RecurrenceSection = ({
  bgColor,
  event,
}: RecurrenceSectionProps) => {
  const [repeatCount, setRepeatCount] = useState(1);
  const [weekDays, setWeekDays] = useState<string[]>([
    getDefaultWeekDay(event),
  ]);

  useEffect(() => {
    const recurrenceDates = generateRecurrenceDates({
      event,
      repeatCount,
      weekDays,
    });
    console.info("recurrenceDates", recurrenceDates);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repeatCount, weekDays, event.startDate, event.endDate]);

  return (
    <StyledRecurrenceSection>
      <RecurrenceRepeatCountSelect
        bgColor={bgColor}
        initialValue={repeatCount}
        onChange={setRepeatCount}
        min={1}
        max={12}
      />
      <WeekDays bgColor={bgColor} value={weekDays} onChange={setWeekDays} />
      <EndsOnDate numWeeks={repeatCount} />
    </StyledRecurrenceSection>
  );
};

export const RecurrenceRepeatCountSelect = ({
  bgColor,
  initialValue,
  onChange,
  min,
  max,
}: {
  bgColor: string;
  initialValue: number;
  onChange: (repeatCount: number) => void;
  min: number;
  max: number;
}) => {
  const [value, setValue] = useState(initialValue);

  return (
    <StyledRecurrenceRepeatCountSelect>
      <StyledText size="l">Repeat every</StyledText>
      <StyledRepeatCountInput
        bgColor={bgColor}
        type="number"
        max={12}
        min={1}
        value={value}
        readOnly
      />
      <CaretInput
        onChange={(type) => {
          if (type === "increase") {
            if (value < max) {
              setValue(value + 1);
              onChange(value + 1);
            }
          } else {
            if (value > min) {
              setValue(value - 1);
              onChange(value - 1);
            }
          }
        }}
      />
      <StyledText size="l">{value === 1 ? "week" : "weeks"} on:</StyledText>
    </StyledRecurrenceRepeatCountSelect>
  );
};

const CaretInput = ({
  onChange,
}: {
  onChange: (type: "increase" | "decrease") => void;
}) => {
  return (
    <StyledCaretInputContainer>
      <StyledCaretButton
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onChange("increase");
        }}
      >
        <CaretUp size={14} />
      </StyledCaretButton>
      <StyledCaretButton
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onChange("decrease");
        }}
      >
        <CaretDown size={14} />
      </StyledCaretButton>
    </StyledCaretInputContainer>
  );
};

const WeekDays = ({
  bgColor,
  value,
  onChange,
}: {
  bgColor: string;
  value: string[];
  onChange: (days: string[]) => void;
}) => {
  return (
    <StyledWeekDaysContainer>
      {WEEKDAYS.map((day) => (
        <StyledWeekDayContainer key={day}>
          <WeekDay
            day={day}
            bgColor={bgColor}
            onClick={() => {
              if (value.includes(day)) {
                onChange(value.filter((d) => d !== day));
              } else {
                onChange([...value, day]);
              }
            }}
            selected={value.includes(day)}
          />
        </StyledWeekDayContainer>
      ))}
    </StyledWeekDaysContainer>
  );
};

const WeekDay = ({
  day,
  bgColor,
  onClick,
  selected,
}: {
  day: string;
  bgColor: string;
  onClick: () => void;
  selected: boolean;
}) => {
  return (
    <StyledWeekDay
      bgColor={bgColor}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      selected={selected}
    >
      {day.charAt(0).toUpperCase()}
    </StyledWeekDay>
  );
};

const EndsOnDate = ({ numWeeks }: { numWeeks: number }) => {
  return (
    <StyledEndsOnDate>
      <StyledText size="l">
        Ends after {numWeeks} {numWeeks === 1 ? "week" : "weeks"}
      </StyledText>
    </StyledEndsOnDate>
  );
};
