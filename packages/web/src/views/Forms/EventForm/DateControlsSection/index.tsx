import React from "react";
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
    </StyledControlsSection>
  );
};
