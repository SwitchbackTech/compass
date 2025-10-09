import React, { useCallback } from "react";
import { ConditionalRender } from "@web/components/ConditionalRender/ConditionalRender";
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
}

export const RecurrenceToggle = ({
  hasRecurrence,
  toggleRecurrence,
}: RecurrenceToggleProps) => {
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleRecurrence();
      }
    },
    [toggleRecurrence],
  );

  return (
    <StyledRepeatRow>
      <ConditionalRender condition={hasRecurrence}>
        <StyledRepeatContainer onClick={toggleRecurrence}>
          <StyledRepeatText
            hasRepeat={hasRecurrence}
            onKeyDown={handleKeyDown}
            tabIndex={0}
          >
            <RepeatIcon size={18} />
            <span>Repeat</span>
          </StyledRepeatText>
        </StyledRepeatContainer>
      </ConditionalRender>

      <ConditionalRender condition={!hasRecurrence}>
        <StyledRepeatTextContainer
          aria-label="Edit recurrence"
          onClick={toggleRecurrence}
          onKeyDown={handleKeyDown}
          role="button"
          tabIndex={0}
        >
          <RepeatIcon size={18} />
          <span>Repeat</span>
        </StyledRepeatTextContainer>
      </ConditionalRender>
    </StyledRepeatRow>
  );
};
