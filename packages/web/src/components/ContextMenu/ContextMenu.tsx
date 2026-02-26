import React from "react";
import styled from "styled-components";
import {
  FloatingContext,
  useClick,
  useDismiss,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import { ZIndex } from "@web/common/constants/web.constants";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { ContextMenuItems } from "./ContextMenuItems";

const MenuWrapper = styled.ul`
  position: absolute;
  background-color: ${({ theme }) => theme.color.menu.bg};
  border: ${({ theme }) => `1px solid ${theme.color.border.primary}`};
  box-shadow: ${({ theme }) => `0px 4px 6px ${theme.color.shadow.default}`};
  border-radius: ${({ theme }) => theme.shape.borderRadius};
  padding: 5px 0;
  list-style: none;
  z-index: ${ZIndex.LAYER_2};
  min-width: 160px;
`;

interface ContextMenuProps {
  event?: Schema_GridEvent;
  onOutsideClick: () => void;
  close: () => void;
  style: React.CSSProperties;
  context: FloatingContext;
}

export const ContextMenu = React.forwardRef<HTMLUListElement, ContextMenuProps>(
  ({ event, onOutsideClick, close, style, context }, ref) => {
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
      <MenuWrapper ref={ref} style={style} {...getFloatingProps()}>
        <ContextMenuItems event={event} close={close} />
      </MenuWrapper>
    );
  },
);

ContextMenu.displayName = "ContextMenu";
