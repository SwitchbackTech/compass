import { Priorities } from "@core/constants/core.constants";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
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

export interface ContextMenuAction {
  id: string;
  label: string;
  onClick: () => void;
}

interface ContextMenuItemsProps {
  weekProps: WeekProps;
  gridEvent: Schema_GridEvent;
  onItemClick?: () => void;
}

function ContextMenuItems({
  weekProps,
  gridEvent,
  onItemClick,
}: ContextMenuItemsProps) {
  const dispatch = useAppDispatch();
  const {
    draftUtil: { submit },
  } = useDraftUtil(
    // @ts-expect-error
    {},
    weekProps,
    false
  );

  const [selectedPriority, setSelectedPriority] = useState(gridEvent.priority);

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

  const handleEditPriority = (priority: Priorities) => {
    setSelectedPriority(priority);
    submit({ ...gridEvent, priority });
    onItemClick();
  };

  const actions: ContextMenuAction[] = [
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
          {item.label}
        </MenuItem>
      ))}
    </>
  );
}

export default ContextMenuItems;
