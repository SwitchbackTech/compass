import React, { ReactNode, useEffect, useRef, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@web/components/Tooltip";
import { StyledShortcutTip } from "@web/components/Tooltip/styled";
import { useMenuContext } from "./ActionsMenu";
import { StyledMenuItem } from "./styled";

export interface MenuItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Content to render inside the delayed tooltip. If omitted, the tooltip is disabled.
   */
  tooltipContent?: ReactNode;
  bgColor: string;
}

const MenuItem: React.FC<MenuItemProps> = ({
  tooltipContent,
  children,
  onClick,
  bgColor,
  ...rest
}) => {
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const menuContext = useMenuContext();
  const itemRef = useRef<HTMLButtonElement | null>(null);
  const indexRef = useRef<number | null>(null);

  // Register with menu context
  useEffect(() => {
    if (menuContext && itemRef.current) {
      const index = menuContext.listRef.current.length;
      indexRef.current = index;
      menuContext.listRef.current[index] = itemRef.current;

      return () => {
        if (indexRef.current !== null) {
          menuContext.listRef.current[indexRef.current] = null;
        }
      };
    }
  }, [menuContext]);

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
          bgColor={bgColor}
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
