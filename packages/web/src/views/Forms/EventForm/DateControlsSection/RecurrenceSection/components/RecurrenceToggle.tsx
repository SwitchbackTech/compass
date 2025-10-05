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
      toggleRecurrence();
      onToggleForm();
    } else {
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
        <StyledRepeatContainer onClick={toggleRecurrence}>
          <StyledRepeatText
            hasRepeat={hasRecurrence}
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                toggleRecurrence();
              }
            }}
          >
            Does not repeat
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
