import { type Categories_Event } from "@core/types/event.types";
import React from "react";
import {
  DateTimeSection,
  type Props as DateTimeSectionProps,
} from "../DateTimeSection/DateTimeSection";
import { StyledControlsSection } from "./styled";

interface Props {
  dateTimeSectionProps: DateTimeSectionProps;
  eventCategory: Categories_Event;
}

export const DateControlsSection = ({ dateTimeSectionProps }: Props) => {
  return (
    <StyledControlsSection>
      <DateTimeSection {...dateTimeSectionProps} />
    </StyledControlsSection>
  );
};
