import { useCallback } from "react";
import { RepeatIcon } from "@web/components/Icons/Repeat";
import { TooltipWrapper } from "@web/components/Tooltip/TooltipWrapper";
import {
  StyledRepeatButton,
  StyledRepeatRow,
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

  const toggle = (
    <StyledRepeatButton
      aria-disabled={disabled || undefined}
      aria-label={hasRecurrence || disabled ? "Repeat" : "Edit recurrence"}
      hasRepeat={hasRecurrence}
      $disabled={disabled}
      onClick={onToggle}
      type="button"
    >
      <RepeatIcon size={18} />
      <span>Repeat</span>
    </StyledRepeatButton>
  );

  return (
    <StyledRepeatRow>
      {disabled && disabledMessage ? (
        <TooltipWrapper description={disabledMessage}>{toggle}</TooltipWrapper>
      ) : (
        toggle
      )}
    </StyledRepeatRow>
  );
};
