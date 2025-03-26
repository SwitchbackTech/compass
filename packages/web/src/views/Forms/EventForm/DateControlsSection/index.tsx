import React from "react";
import { RecurrenceSection } from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/RecurrenceSection";
import {
  DateTimeSection,
  Props as DateTimeSectionProps,
} from "./DateTimeSection/DateTimeSection";
import { StyledControlsSection } from "./styled";

interface Props {
  dateTimeSectionProps: DateTimeSectionProps;
}

export const DateControlsSection = ({ dateTimeSectionProps }: Props) => {
  return (
    <StyledControlsSection>
      <DateTimeSection {...dateTimeSectionProps} />
      <RecurrenceSection bgColor={dateTimeSectionProps.bgColor} />
    </StyledControlsSection>
  );
};
