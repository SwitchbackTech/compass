import { Priorities } from "@core/constants/core.constants";
import { colorByPriority } from "@web/common/styles/theme.util";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import IconButton from "@web/components/IconButton/IconButton";
import { Trash, PenNib } from "@phosphor-icons/react";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { useAppDispatch } from "@web/store/store.hooks";
import { useDraftUtil } from "@web/views/Calendar/hooks/draft/useDraftUtil";
import { WeekProps } from "@web/views/Calendar/hooks/useWeek";
import React, { useState } from "react";
import styled from "styled-components";

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

const MenuItemLabel = styled.span`
  font-size: ${({ theme }) => theme.text.size.l};
`;

export interface ContextMenuAction {
  id: string;
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
}

interface ContextMenuItemsProps {
  weekProps: WeekProps;
  event: Schema_GridEvent;
  onItemClick?: () => void;
}

function ContextMenuItems({
  weekProps,
  event,
  onItemClick,
}: ContextMenuItemsProps) {
  const dispatch = useAppDispatch();
  const {
    draftUtil: { submit, deleteEvent },
  } = useDraftUtil(
    // @ts-expect-error
    {},
    weekProps,
    false
  );

  const [selectedPriority, setSelectedPriority] = useState(event.priority);

  const priorities = [
    {
      id: "work",
      value: Priorities.WORK,
      color: colorByPriority[Priorities.WORK],
    },
    {
      id: "self",
      value: Priorities.SELF,
      color: colorByPriority[Priorities.SELF],
    },
    {
      id: "relations",
      value: Priorities.RELATIONS,
      color: colorByPriority[Priorities.RELATIONS],
    },
  ];

  const handleEditPriority = (priority: Priorities) => {
    setSelectedPriority(priority);
    submit({ ...event, priority });
    onItemClick && onItemClick();
  };

  const handleEdit = () => {
    dispatch(
      draftSlice.actions.start({
        source: "contextMenu",
        event: { ...event, isOpen: true },
      })
    );
  };

  const handleDelete = () => {
    deleteEvent();
  };

  const actions: ContextMenuAction[] = [
    {
      id: "edit",
      label: "Edit",
      onClick: handleEdit,
      icon: (
        <IconButton>
          <PenNib />
        </IconButton>
      ),
    },
    {
      id: "delete",
      label: "Delete",
      onClick: handleDelete,
      icon: (
        <IconButton>
          <Trash />
        </IconButton>
      ),
    },
  ];

  return (
    <>
      <PriorityContainer>
        {priorities.map((priority) => (
          <PriorityCircle
            key={priority.id}
            color={priority.color}
            selected={selectedPriority === priority.value}
            onClick={() => handleEditPriority(priority.value)}
          />
        ))}
      </PriorityContainer>
      {actions.map((item) => (
        <MenuItem
          key={item.id}
          onClick={() => {
            item.onClick();
            onItemClick && onItemClick();
          }}
        >
          {item.icon}
          <MenuItemLabel>{item.label}</MenuItemLabel>
        </MenuItem>
      ))}
    </>
  );
}

export default ContextMenuItems;
