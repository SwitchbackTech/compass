import React from "react";
import { Categories_Event } from "@web/common/types/web.event.types";
import {
  DateTimeSection,
  Props as DateTimeSectionProps,
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
