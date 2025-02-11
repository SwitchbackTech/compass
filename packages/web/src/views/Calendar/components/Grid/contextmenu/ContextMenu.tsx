import React, { useState } from "react";
import styled from "styled-components";
import {
  useInteractions,
  useDismiss,
  useClick,
  useRole,
  FloatingContext,
} from "@floating-ui/react";
import { useAppDispatch } from "@web/store/store.hooks";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { Priorities } from "@core/constants/core.constants";
import { Schema_GridEvent } from "@web/common/types/web.event.types";

const MenuWrapper = styled.ul`
  position: absolute;
  background-color: white;
  border: 1px solid #ccc;
  box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
  border-radius: ${({ theme }) => theme.shape.borderRadius};
  padding: 5px 0;
  list-style: none;
  z-index: 1000;
  min-width: 160px;
`;

const PriorityContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 10px;
  padding: 10px;
`;

const PriorityCircle = styled.div<{ color: string; selected: boolean }>`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid ${({ color }) => color};
  background-color: ${({ selected, color }) =>
    selected ? color : "transparent"};
  cursor: pointer;
  transition: all 0.2s ease-in-out;
`;

const MenuItem = styled.li`
  padding: 10px 12px;
  cursor: pointer;
  user-select: none;
  font-size: 14px;
  color: #333;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid #eee;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background-color: #f5f5f5;
  }
`;

interface ContextMenuProps {
  gridEvent: Schema_GridEvent;
  onOutsideClick: () => void;
  onMenuItemClick: () => void;
  style: React.CSSProperties;
  context: FloatingContext;
}

const ContextMenu = React.forwardRef<HTMLUListElement, ContextMenuProps>(
  ({ gridEvent, onOutsideClick, onMenuItemClick, style, context }, ref) => {
    const dispatch = useAppDispatch();
    const [selectedPriority, setSelectedPriority] = useState(
      Priorities.UNASSIGNED
    );

    // TODO: Use colors from constant
    const priorities = [
      { id: "work", value: Priorities.WORK, color: "rgb(200, 236, 249)" },
      { id: "self", value: Priorities.SELF, color: "rgb(149, 189, 219)" },
      {
        id: "relations",
        value: Priorities.RELATIONS,
        color: "rgb(134, 208, 187)",
      },
    ];

    const actions = [
      {
        id: "edit",
        label: "✏️ Edit",
        onClick: () => {
          dispatch(
            draftSlice.actions.start({
              source: "contextMenu",
              event: { ...gridEvent, isOpen: true },
            })
          );
        },
      },
      {
        id: "delete",
        label: "🗑️ Delete",
        onClick: () => alert("Delete clicked"),
      },
    ];

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
        <PriorityContainer>
          {priorities.map((priority) => (
            <PriorityCircle
              key={priority.id}
              color={priority.color}
              selected={selectedPriority === priority.value}
              onClick={() => setSelectedPriority(priority.value)}
            />
          ))}
        </PriorityContainer>
        {actions.map((item) => (
          <MenuItem
            key={item.id}
            onClick={() => {
              item.onClick();
              onMenuItemClick();
            }}
          >
            {item.label}
          </MenuItem>
        ))}
      </MenuWrapper>
    );
  }
);

export default ContextMenu;
