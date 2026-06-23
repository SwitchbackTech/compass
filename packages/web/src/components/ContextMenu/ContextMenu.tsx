import {
  type FloatingContext,
  useClick,
  useDismiss,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import React from "react";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import {
  ContextMenuItems,
  type ContextMenuItemsActions,
  ContextMenuItemsView,
} from "./ContextMenuItems";

interface ContextMenuProps {
  actions?: ContextMenuItemsActions;
  event?: Schema_GridEvent;
  isPending?: boolean;
  onOutsideClick: () => void;
  close: () => void;
  style: React.CSSProperties;
  context: FloatingContext;
}

export const ContextMenu = React.forwardRef<HTMLUListElement, ContextMenuProps>(
  (
    {
      actions,
      event,
      isPending = false,
      onOutsideClick,
      close,
      style,
      context,
    },
    ref,
  ) => {
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

    if (!event) return null;

    return (
      <ul
        className="c-context-menu"
        ref={ref}
        style={style}
        {...getFloatingProps()}
      >
        {actions ? (
          <ContextMenuItemsView
            actions={actions}
            close={close}
            event={event}
            isPending={isPending}
          />
        ) : (
          <ContextMenuItems event={event} close={close} />
        )}
      </ul>
    );
  },
);

ContextMenu.displayName = "ContextMenu";
