import React from "react";
import styled from "styled-components";
import {
  useInteractions,
  useDismiss,
  useClick,
  useRole,
  FloatingContext,
} from "@floating-ui/react";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import { ContextMenuItems } from "./ContextMenuItems";

const MenuWrapper = styled.ul`
  position: absolute;
  background-color: ${({ theme }) => theme.color.menu.bg};
  border: ${({ theme }) => `1px solid ${theme.color.border.primary}`};
  box-shadow: ${({ theme }) => `0px 4px 6px ${theme.color.shadow.default}`};
  border-radius: ${({ theme }) => theme.shape.borderRadius};
  padding: 5px 0;
  list-style: none;
  z-index: 1000;
  min-width: 160px;
`;

interface ContextMenuProps {
  weekProps: WeekProps;
  event: Schema_GridEvent;
  onOutsideClick: () => void;
  onMenuItemClick: () => void;
  style: React.CSSProperties;
  context: FloatingContext;
}

export const ContextMenu = React.forwardRef<HTMLUListElement, ContextMenuProps>(
  (
    {
      weekProps,
      event: calEvent,
      onOutsideClick,
      onMenuItemClick,
      style,
      context,
    },
    ref
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

    return (
      <MenuWrapper ref={ref} style={style} {...getFloatingProps()}>
        <ContextMenuItems
          weekProps={weekProps}
          event={calEvent}
          onItemClick={onMenuItemClick}
        />
      </MenuWrapper>
    );
  }
);
