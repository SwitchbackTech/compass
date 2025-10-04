import React, { Dispatch, SetStateAction, useEffect } from "react";
import { Frequency } from "rrule";
import { Schema_Event } from "@core/types/event.types";
import { StyledRepeatRow } from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/styled";
import { FrequencyValues } from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/util/recurrence.util";
import { useRecurrence } from "../useRecurrence/useRecurrence";
import { SomedayRecurrenceSelect } from "./SomedayRecurrenceSelect/SomedayRecurrenceSelect";

export type SomedayFrequencyOption = {
  label: string;
  value: FrequencyValues;
};

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
  const { freq, setFreq, toggleRecurrence } = recurrenceHook;
  const { hasRecurrence } = recurrenceHook;

  // Set default frequency to Weekly for someday events if it's Daily
  useEffect(() => {
    if (hasRecurrence && freq === Frequency.DAILY) {
      setFreq(Frequency.WEEKLY);
    }
  }, [hasRecurrence, freq, setFreq]);

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
