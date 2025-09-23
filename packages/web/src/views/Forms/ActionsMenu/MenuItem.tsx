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

  &:focus {
    border: 1px solid ${({ theme }) => theme.color.border.primary};
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
  onClick,
  ...rest
}) => {
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if ((e.key === "Enter" || e.key === " ") && onClick) {
      e.preventDefault();
      // @ts-expect-error - onClick is a function that takes a MouseEvent
      onClick(e);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onClick) {
      onClick(e);
    }
  };

  // With tooltip
  return (
    <Tooltip
      open={isTooltipOpen}
      onOpenChange={setIsTooltipOpen}
      placement="right-end"
    >
      <TooltipTrigger asChild>
        <StyledMenuItem
          {...rest}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          role="menuitem"
          tabIndex={-1}
        >
          {children}
        </StyledMenuItem>
      </TooltipTrigger>
      <TooltipContent>
        <StyledShortcutTip>{tooltipContent}</StyledShortcutTip>
      </TooltipContent>
    </Tooltip>
  );
};

export default MenuItem;
