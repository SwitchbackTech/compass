import React, { Dispatch, SetStateAction } from "react";
import { Frequency } from "rrule";
import { Schema_Event } from "@core/types/event.types";
import { RepeatIcon } from "@web/components/Icons/Repeat";
import { StyledRepeatRow } from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/styled";
import { StyledRepeatTextContainer } from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/styled";
import { useRecurrence } from "../useRecurrence/useRecurrence";
import {
  SomedayFrequencyOption,
  SomedayRecurrenceSelect,
} from "./SomedayRecurrenceSelect/SomedayRecurrenceSelect";

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
  const [isEditing, setIsEditing] = React.useState(false);
  const [menuIsOpen, setMenuIsOpen] = React.useState<boolean | undefined>(
    undefined,
  );

  const handleSelect = (option: SomedayFrequencyOption) => {
    if (option.value === Frequency.DAILY) {
      if (hasRecurrence) {
        toggleRecurrence();
      }
      setIsEditing(false);
      setMenuIsOpen(undefined);
      return;
    }

    if (!hasRecurrence) {
      toggleRecurrence();
    }

    setFreq(option.value);
    setMenuIsOpen(undefined);
    setIsEditing(false);
  };

  const handleMenuClose = () => {
    setMenuIsOpen(undefined);
    if (!hasRecurrence) {
      setIsEditing(false);
    }
  };

  const openSelect = () => {
    setIsEditing(true);
    setMenuIsOpen(true);
  };

  const shouldShowSelect = hasRecurrence || isEditing;

  return (
    <StyledRepeatRow>
      {shouldShowSelect ? (
        <SomedayRecurrenceSelect
          bgColor={bgColor}
          hasRecurrence={hasRecurrence}
          freq={freq}
          onSelect={handleSelect}
          menuIsOpen={menuIsOpen}
          onMenuClose={handleMenuClose}
        />
      ) : (
        <StyledRepeatTextContainer
          aria-label="Edit recurrence"
          onClick={openSelect}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openSelect();
            }
          }}
          role="button"
          tabIndex={0}
        >
          <RepeatIcon size={18} />
          <span>Repeat</span>
        </StyledRepeatTextContainer>
      )}
    </StyledRepeatRow>
  );
};
