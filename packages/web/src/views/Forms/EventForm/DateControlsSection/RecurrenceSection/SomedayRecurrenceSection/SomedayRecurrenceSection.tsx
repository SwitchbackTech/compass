import React, { Dispatch, SetStateAction } from "react";
import { Schema_Event } from "@core/types/event.types";
import { StyledRepeatRow } from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/styled";
import { useRecurrence } from "../useRecurrence/useRecurrence";
import { SomedayRecurrenceSelect } from "./SomedayRecurrenceSelect/SomedayRecurrenceSelect";
import { SomedayFrequencyOption } from "./SomedayRecurrenceSelect/SomedayRecurrenceSelect";

export interface SomedayRecurrenceSectionProps {
  bgColor: string;
  event: Schema_Event;
  setEvent: Dispatch<SetStateAction<Schema_Event | null>>;
}

export const SomedayRecurrenceSection = ({
  bgColor,
  event,
  setEvent,
}: SomedayRecurrenceSectionProps) => {
  const recurrenceHook = useRecurrence(event, { setEvent });
  const { freq, hasRecurrence, setFreq, toggleRecurrence } = recurrenceHook;

  const handleSelect = (option: SomedayFrequencyOption | null) => {
    if (!option) {
      if (hasRecurrence) {
        toggleRecurrence();
      }
      return;
    }

    if (!hasRecurrence) {
      toggleRecurrence();
    }

    setFreq(option.value);
  };

  return (
    <StyledRepeatRow>
      <SomedayRecurrenceSelect
        bgColor={bgColor}
        hasRecurrence={hasRecurrence}
        freq={freq}
        onSelect={handleSelect}
      />
    </StyledRepeatRow>
  );
};
