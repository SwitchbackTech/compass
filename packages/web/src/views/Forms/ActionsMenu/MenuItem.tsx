import React, { ReactNode, useRef, useState } from "react";
import styled from "styled-components";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@web/components/Tooltip";
import { StyledShortcutTip } from "@web/components/Tooltip/styled";
import { useMenuContext } from "./ActionsMenu";

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
    outline: none;
    background-color: ${({ theme }) => theme.color.bg.secondary};
    color: ${({ theme }) => theme.color.text.light};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.color.border.primary};
    outline-offset: 2px;
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
  const menuContext = useMenuContext();
  const itemRef = useRef<HTMLButtonElement | null>(null);
  const indexRef = useRef<number | null>(null);

  // Helper function to extract text from children
  const getMenuItemText = React.useCallback(() => {
    if (typeof children === "string") return children;
    if (Array.isArray(children)) {
      const textChild = children.find(
        (child) =>
          typeof child === "string" ||
          (child &&
            typeof child === "object" &&
            "props" in child &&
            typeof child.props?.children === "string"),
      );
      if (typeof textChild === "string") return textChild;
      if (textChild && typeof textChild === "object" && "props" in textChild) {
        return textChild.props?.children || "Unknown";
      }
      // Try to extract from span elements
      const spanChild = children.find(
        (child) =>
          child &&
          typeof child === "object" &&
          "type" in child &&
          child.type === "span",
      );
      if (spanChild && typeof spanChild === "object" && "props" in spanChild) {
        return spanChild.props?.children || "Unknown";
      }
    }
    return itemRef.current?.textContent || "Unknown";
  }, [children]);

  // Register with menu context (only depend on menuContext, not getMenuItemText to avoid loops)
  React.useEffect(() => {
    if (menuContext && itemRef.current) {
      const index = menuContext.listRef.current.length;
      indexRef.current = index;
      menuContext.listRef.current[index] = itemRef.current;

      const menuItemText = getMenuItemText();
      console.log(
        `📝 Registered menu item: "${menuItemText}" at index ${index}`,
      );
      console.log(
        `📋 Current listRef length: ${menuContext.listRef.current.length}`,
      );

      return () => {
        if (indexRef.current !== null) {
          console.log(
            `🗑️ Unregistering menu item: "${menuItemText}" from index ${indexRef.current}`,
          );
          menuContext.listRef.current[indexRef.current] = null;
        }
      };
    }
  }, [menuContext]); // Remove getMenuItemText dependency to stop infinite loop

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    // Handle Enter/Space for activation
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (onClick) {
        // @ts-expect-error - onClick is a function that takes a MouseEvent
        onClick(e);
      }
    }
  };

  // Update tabIndex based on activeIndex (roving tabIndex pattern)
  const isActive = menuContext?.activeIndex === indexRef.current;
  const tabIndex = isActive ? 0 : -1;

  // Debug logging to track navigation
  React.useEffect(() => {
    if (isActive) {
      const menuItemText = getMenuItemText();
      console.log(
        `🎯 Active menu item: "${menuItemText}" (index: ${indexRef.current})`,
      );
    }
  }, [isActive, getMenuItemText]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onClick) {
      onClick(e);
    }
  };

  const itemProps =
    menuContext?.getItemProps({
      onClick: handleClick,
      onKeyDown: handleKeyDown,
    }) || {};

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
          {...itemProps}
          ref={itemRef}
          role="menuitem"
          tabIndex={tabIndex}
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
