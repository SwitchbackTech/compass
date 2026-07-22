import { useState } from "react";
import { type FrequencyValues } from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/constants/recurrence.constants";
import { CaretInput } from "./CaretInput";
import { FreqSelect } from "./FreqSelect";

export interface RecurrenceIntervalSelectProps {
  frequency: FrequencyValues;
  onFreqSelect: (option: FrequencyValues) => void;
  initialValue: number;
  onChange: (repeatCount: number) => void;
  min: number;
  max: number;
}

export const RecurrenceIntervalSelect = ({
  frequency,
  onFreqSelect,
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
    <div className="mb-1 flex w-full basis-full items-center gap-2 p-0">
      <span className="relative text-m">Every</span>

      <input
        className="ml-1 h-9.5 w-8 rounded-sm border border-transparent bg-surface-overlay px-1 text-center text-m text-text transition-all duration-300 focus:shadow-[0_0_0_2px_var(--border-strong)] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&[type=number]]:[appearance:textfield]"
        type="number"
        max={max}
        min={min}
        value={value}
        readOnly
      />

      <CaretInput onChange={handleChange} />

      <FreqSelect
        value={frequency}
        plural={value > 1}
        onFreqSelect={onFreqSelect}
      />
    </div>
  );
};
