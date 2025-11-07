import React from "react";
import {
  FloatingContext,
  useClick,
  useDismiss,
  useInteractions,
  useRole,
} from "@floating-ui/react";

interface BaseContextMenuProps {
  onOutsideClick: () => void;
  style: React.CSSProperties;
  context: FloatingContext;
  children: React.ReactNode;
}

export const BaseContextMenu = React.forwardRef<
  HTMLUListElement,
  BaseContextMenuProps
>(({ onOutsideClick, style, context, children }, ref) => {
  const dismiss = useDismiss(context, {
    outsidePress: (event) => {
      event.preventDefault(); // Prevents clicking another UI element when dismissing
      onOutsideClick();
      return true;
    },
  });

  const click = useClick(context, { enabled: true });

  const role = useRole(context, { role: "menu" });

  const { getFloatingProps } = useInteractions([dismiss, click, role]);

  return (
    <ul
      ref={ref}
      style={style}
      {...getFloatingProps()}
      className="absolute z-[1000] min-w-[160px] list-none rounded border border-gray-600 bg-gray-800 py-1 shadow-md"
    >
      {children}
    </ul>
  );
});

BaseContextMenu.displayName = "BaseContextMenu";
