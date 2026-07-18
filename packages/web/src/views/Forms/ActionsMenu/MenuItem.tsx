import type React from "react";
import { useEffect, useRef, useState } from "react";
import { ShortcutKeys } from "@web/components/Shortcuts/ShortcutKeys";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@web/components/Tooltip";
import { useMenuContext } from "./ActionsMenu";

export interface MenuItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Shortcut shown as per-key chips in the delayed tooltip: a single key
   * (`"Delete"`) or a combo as a key array (`["Mod", "D"]`). If omitted (or
   * empty), the tooltip is disabled.
   */
  tooltip?: string | string[];
  bgColor: string;
}

const MenuItem: React.FC<MenuItemProps> = ({
  tooltip,
  children,
  onClick,
  bgColor,
  type = "button",
  ...rest
}) => {
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const menuContext = useMenuContext();
  const itemRef = useRef<HTMLButtonElement | null>(null);
  const indexRef = useRef<number | null>(null);

  // Register with menu context. Depend on the stable `listRef` object
  // (not `menuContext` itself, which is a new object every render because
  // it carries `activeIndex`) so this doesn't tear down and re-register on
  // every arrow-key press.
  const listRef = menuContext?.listRef;
  useEffect(() => {
    if (listRef && itemRef.current) {
      const index = listRef.current.length;
      indexRef.current = index;
      listRef.current[index] = itemRef.current;

      return () => {
        if (indexRef.current !== null) {
          listRef.current[indexRef.current] = null;
        }
      };
    }
  }, [listRef]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    // Handle Enter/Space for activation
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
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

  const button = (
    <button
      {...rest}
      {...itemProps}
      ref={itemRef}
      role="menuitem"
      tabIndex={tabIndex}
      type={type}
      className="c-focus-ring flex w-full cursor-pointer items-center gap-2 rounded-xs border-0 bg-(--actions-menu-item-bg) px-2 py-1.5 text-left text-m text-text-light transition-colors hover:bg-text-lighter/10 focus-visible:bg-text-lighter/10"
      // Paint the resting background through a CSS variable (not an inline
      // background-color) so the hover/focus utilities above can override it;
      // an inline background-color would always win over a class.
      style={{ "--actions-menu-item-bg": bgColor } as React.CSSProperties}
    >
      {children}
    </button>
  );

  // No keys to show -> render the bare button (no empty tooltip surface).
  if (!tooltip || tooltip.length === 0) {
    return button;
  }

  return (
    <Tooltip
      open={isTooltipOpen}
      onOpenChange={setIsTooltipOpen}
      placement="right-end"
    >
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>
        <ShortcutKeys keys={tooltip} />
      </TooltipContent>
    </Tooltip>
  );
};

export default MenuItem;
