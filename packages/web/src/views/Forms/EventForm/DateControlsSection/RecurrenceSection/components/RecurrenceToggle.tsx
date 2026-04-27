import type React from "react";
import { useCallback } from "react";
import { ConditionalRender } from "@web/components/ConditionalRender/ConditionalRender";
import { RepeatIcon } from "@web/components/Icons/Repeat";
import {
  StyledRepeatContainer,
  StyledRepeatRow,
  StyledRepeatText,
  StyledRepeatTextContainer,
  StyledRepeatUnavailableText,
} from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/styled";

export interface RecurrenceToggleProps {
  disabled?: boolean;
  disabledMessage?: string;
  hasRecurrence: boolean;
  toggleRecurrence: () => void;
}

export const RecurrenceToggle = ({
  disabled = false,
  disabledMessage,
  hasRecurrence,
  toggleRecurrence,
}: RecurrenceToggleProps) => {
  const onToggle = useCallback(() => {
    if (disabled) return;
    toggleRecurrence();
  }, [disabled, toggleRecurrence]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onToggle();
      }
    },
    [onToggle],
  );

  return (
    <StyledRepeatRow>
      <ConditionalRender condition={hasRecurrence}>
        <StyledRepeatContainer $disabled={disabled} onClick={onToggle}>
          <StyledRepeatText
            aria-disabled={disabled || undefined}
            hasRepeat={hasRecurrence}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            title={disabled ? disabledMessage : undefined}
            $disabled={disabled}
          >
            <RepeatIcon size={18} />
            <span>Repeat</span>
          </StyledRepeatText>
        </StyledRepeatContainer>
      </ConditionalRender>

      <ConditionalRender condition={!hasRecurrence}>
        <StyledRepeatTextContainer
          aria-disabled={disabled || undefined}
          aria-label={disabled ? "Repeat" : "Edit recurrence"}
          $disabled={disabled}
          onClick={onToggle}
          onKeyDown={handleKeyDown}
          role="button"
          tabIndex={0}
          title={disabled ? disabledMessage : undefined}
        >
          <RepeatIcon size={18} />
          <span>Repeat</span>
        </StyledRepeatTextContainer>
      </ConditionalRender>

      <ConditionalRender condition={Boolean(disabled && disabledMessage)}>
        <StyledRepeatUnavailableText>
          {disabledMessage}
        </StyledRepeatUnavailableText>
      </ConditionalRender>
    </StyledRepeatRow>
  );
};
