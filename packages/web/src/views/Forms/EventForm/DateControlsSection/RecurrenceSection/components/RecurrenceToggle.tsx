import React from "react";
import { RepeatIcon } from "@web/components/Icons/Repeat";
import {
  StyledRepeatContainer,
  StyledRepeatRow,
  StyledRepeatText,
  StyledRepeatTextContainer,
} from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/styled";

export interface RecurrenceToggleProps {
  hasRecurrence: boolean;
  toggleRecurrence: () => void;
  showForm: boolean;
  onToggleForm: () => void;
}

export const RecurrenceToggle = ({
  hasRecurrence,
  toggleRecurrence,
  showForm,
  onToggleForm,
}: RecurrenceToggleProps) => {
  const handleClick = () => {
    if (!hasRecurrence) {
      // Enable recurrence and show form
      toggleRecurrence();
      onToggleForm();
    } else {
      // Toggle form visibility when recurrence is already enabled
      onToggleForm();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleClick();
    }
  };

  return (
    <StyledRepeatRow>
      {!hasRecurrence || showForm ? (
        <StyledRepeatContainer onClick={handleClick}>
          <StyledRepeatText
            hasRepeat={hasRecurrence}
            tabIndex={0}
            onKeyDown={handleKeyDown}
          >
            <RepeatIcon size={18} />
            <span>Repeat</span>
          </StyledRepeatText>
        </StyledRepeatContainer>
      ) : (
        <StyledRepeatTextContainer
          aria-label="Edit recurrence"
          onClick={handleClick}
          onKeyDown={handleKeyDown}
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
