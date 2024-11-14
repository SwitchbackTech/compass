import React from "react";
import styled from "styled-components";
import { CheckCircle } from "@phosphor-icons/react";

import { IconProps } from "./icon.types";
import { TooltipWrapper } from "../Tooltip/TooltipWrapper";

const StyledCheckCircleIcon = styled(CheckCircle)`
  color: ${({ theme }) => theme.color.text.lighter};
  transition: filter 0.2s ease;

  &:hover {
    filter: brightness(130%);
  }
`;

export const TodoIcon: React.FC<IconProps> = (props) => {
  return (
    <TooltipWrapper
      description="Open tasks"
      shortcut="SHIFT + 1"
      onClick={() => {
        console.log("Open tasks");
      }}
    >
      <StyledCheckCircleIcon {...props} />
    </TooltipWrapper>
  );
};
