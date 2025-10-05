import React, { useState } from "react";
import { StyledText } from "@web/components/Text/styled";
import { FrequencyValues } from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/constants/recurrence.constants";
import {
  StyledIntervalInput,
  StyledRepeatRow,
} from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/styled";
import { CaretInput } from "./CaretInput";
import { FreqSelect } from "./FreqSelect";

export interface RecurrenceIntervalSelectProps {
  frequency: FrequencyValues;
  onFreqSelect: (option: FrequencyValues) => void;
  bgColor: string;
  initialValue: number;
  onChange: (repeatCount: number) => void;
  min: number;
  max: number;
}

export const RecurrenceIntervalSelect = ({
  frequency,
  onFreqSelect,
  bgColor,
  initialValue,
  onChange,
  min,
  max,
}: RecurrenceIntervalSelectProps) => {
  const [value, setValue] = useState(initialValue);

  const handleChange = (type: "increase" | "decrease") => {
    if (type === "increase" && value < max) {
      setValue(value + 1);
      onChange(value + 1);
    }

    if (type === "decrease" && value > min) {
      setValue(value - 1);
      onChange(value - 1);
    }
  };

  return (
    <StyledRepeatRow>
      <StyledText size="l">Every</StyledText>

      <StyledIntervalInput
        bgColor={bgColor}
        type="number"
        max={max}
        min={min}
        value={value}
        readOnly
      />

      <CaretInput onChange={handleChange} />

      <FreqSelect
        bgColor={bgColor}
        value={frequency}
        plural={value > 1}
        onFreqSelect={onFreqSelect}
      />
    </StyledRepeatRow>
  );
};
