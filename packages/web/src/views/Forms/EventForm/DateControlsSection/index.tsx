import React from "react";
import {
  RecurrenceSection,
  RecurrenceSectionProps,
} from "@web/views/Forms/EventForm/DateControlsSection/RecurrenceSection/RecurrenceSection";
import {
  DateTimeSection,
  Props as DateTimeSectionProps,
} from "./DateTimeSection/DateTimeSection";
import { StyledControlsSection } from "./styled";

interface Props {
  dateTimeSectionProps: DateTimeSectionProps;
  recurrenceSectionProps: RecurrenceSectionProps;
}

export const DateControlsSection = ({
  dateTimeSectionProps,
  recurrenceSectionProps,
}: Props) => {
  return (
    <StyledControlsSection>
      <DateTimeSection {...dateTimeSectionProps} />
      <RecurrenceSection {...recurrenceSectionProps} />
    </StyledControlsSection>
  );
};
