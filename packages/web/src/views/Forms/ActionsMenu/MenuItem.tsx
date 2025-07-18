import React, { ReactNode, useState } from "react";
import styled from "styled-components";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@web/components/Tooltip";
import { StyledShortcutTip } from "@web/components/Tooltip/styled";

/**
 * Shared menu item styling for the EventActionMenu buttons.
 */
const StyledMenuItem = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  background: none;
  border: none;
  padding: 4px 8px;
  cursor: pointer;
  color: ${({ theme }) => theme.color.text.dark};
  font-size: ${({ theme }) => theme.text.size.m};
  text-align: left;

  &:hover {
    background-color: ${({ theme }) => theme.color.bg.secondary};
    color: ${({ theme }) => theme.color.text.light};
  }
`;

export interface MenuItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Content to render inside the delayed tooltip. If omitted, the tooltip is disabled.
   */
  tooltipContent?: ReactNode;
}

const MenuItem: React.FC<MenuItemProps> = ({
  tooltipContent,
  children,
  ...rest
}) => {
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);

  // With tooltip
  return (
    <Tooltip
      open={isTooltipOpen}
      onOpenChange={setIsTooltipOpen}
      placement="right-end"
    >
      <TooltipTrigger asChild>
        <StyledMenuItem {...rest}>{children}</StyledMenuItem>
      </TooltipTrigger>
      <TooltipContent>
        <StyledShortcutTip>{tooltipContent}</StyledShortcutTip>
      </TooltipContent>
    </Tooltip>
  );
};

export default MenuItem;
