import React from "react";
import { Categories_Event } from "@core/types/event.types";
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
  eventCategory: Categories_Event;
}

export const DateControlsSection = ({
  dateTimeSectionProps,
  recurrenceSectionProps,
  eventCategory,
}: Props) => {
  return (
    <StyledControlsSection>
      <DateTimeSection {...dateTimeSectionProps} />
      {eventCategory === Categories_Event.TIMED && (
        <RecurrenceSection {...recurrenceSectionProps} />
      )}
    </StyledControlsSection>
  );
};
