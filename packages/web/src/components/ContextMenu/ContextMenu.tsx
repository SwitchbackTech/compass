import {
  type FloatingContext,
  useClick,
  useDismiss,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import React from "react";
import { Priorities } from "@core/constants/core.constants";
import { hoverColorByPriority } from "@web/common/styles/theme.util";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import {
  ContextMenuItems,
  type ContextMenuItemsActions,
  ContextMenuItemsView,
} from "./ContextMenuItems";

interface ContextMenuProps {
  actions?: ContextMenuItemsActions;
  event?: Schema_GridEvent;
  onOutsideClick: () => void;
  close: () => void;
  style: React.CSSProperties;
  context: FloatingContext;
}

export const ContextMenu = React.forwardRef<HTMLUListElement, ContextMenuProps>(
  ({ actions, event, onOutsideClick, close, style, context }, ref) => {
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

    const priority = event.priority || Priorities.UNASSIGNED;

    return (
      <ul
        className="c-context-menu"
        ref={ref}
        style={{ ...style, backgroundColor: hoverColorByPriority[priority] }}
        {...getFloatingProps()}
      >
        {actions ? (
          <ContextMenuItemsView actions={actions} close={close} event={event} />
        ) : (
          <ContextMenuItems event={event} close={close} />
        )}
      </ul>
    );
  },
);

ContextMenu.displayName = "ContextMenu";
