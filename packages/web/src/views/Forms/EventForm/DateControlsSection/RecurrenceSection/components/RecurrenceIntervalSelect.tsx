import { useState } from "react";
import { type CSSVariables } from "@web/common/styles/css.types";
import { Text } from "@web/components/Text/Text";
import { type FrequencyValues } from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/constants/recurrence.constants";
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
    <div className="c-recurrence-row">
      <Text size="l">Every</Text>

      <input
        className="c-recurrence-interval"
        style={{ "--recurrence-bg": bgColor } as CSSVariables}
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
    </div>
  );
};
