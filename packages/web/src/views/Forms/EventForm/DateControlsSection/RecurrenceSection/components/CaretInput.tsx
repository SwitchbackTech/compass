import React from "react";
import { CaretDown, CaretUp } from "@phosphor-icons/react";
import {
  StyledCaretButton,
  StyledCaretInputContainer,
} from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/styled";

export interface CaretInputProps {
  onChange: (type: "increase" | "decrease") => void;
}

export const CaretInput = ({ onChange }: CaretInputProps) => {
  return (
    <StyledCaretInputContainer>
      <StyledCaretButton
        onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
          event.preventDefault();
          event.stopPropagation();
          onChange("increase");
        }}
      >
        <CaretUp size={14} />
      </StyledCaretButton>

      <StyledCaretButton
        onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
          event.preventDefault();
          event.stopPropagation();
          onChange("decrease");
        }}
      >
        <CaretDown size={14} />
      </StyledCaretButton>
    </StyledCaretInputContainer>
  );
};
