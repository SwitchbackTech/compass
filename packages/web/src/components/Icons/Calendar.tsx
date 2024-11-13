import React from "react";
import styled from "styled-components";
import { CalendarDots } from "@phosphor-icons/react";

import { TooltipWrapper } from "../Tooltip/TooltipWrapper";
import { IconProps } from "./icon.types";

const StyledCalendarIcon = styled(CalendarDots)`
  color: ${({ theme }) => theme.color.text.lighter};
  transition: filter 0.2s ease;

  &:hover {
    filter: brightness(130%);
  }
`;

export const CalendarIcon: React.FC<IconProps> = (props) => {
  return (
    <TooltipWrapper
      description="Open month widget"
      shortcut="SHIFT + 1"
      onClick={() => {
        console.log("Open month widget");
      }}
    >
      <StyledCalendarIcon {...props} />
    </TooltipWrapper>
  );
};
