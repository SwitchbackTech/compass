import { Priorities } from "@core/constants/core.constants";
import { colorByPriority } from "@web/common/styles/theme.util";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import IconButton from "@web/components/IconButton/IconButton";
import { Trash, PenNib } from "@phosphor-icons/react";
import { draftSlice } from "@web/ducks/events/slices/draft.slice";
import { useAppDispatch } from "@web/store/store.hooks";
import React, { useState } from "react";
import {
  MenuItem,
  MenuItemLabel,
  PriorityCircle,
  PriorityContainer,
} from "./styled";
import { useDraftContext } from "@web/views/Calendar/components/Draft/context/useDraftContext";

export interface ContextMenuAction {
  id: string;
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
}

interface ContextMenuItemsProps {
  event: Schema_GridEvent;
  onItemClick?: () => void;
}

export function ContextMenuItems({
  event,
  onItemClick,
}: ContextMenuItemsProps) {
  const dispatch = useAppDispatch();
  const { actions } = useDraftContext();
  const { submit, deleteEvent } = actions;

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
    if (onItemClick) {
      console.log("onItemClick triggered");
      onItemClick();
    } else {
      console.log("no onItemClick");
    }
  };

  const handleEdit = () => {
    dispatch(
      draftSlice.actions.start({
        source: "contextMenu",
        event: { ...event, isOpen: true },
      }),
    );
  };

  const menuActions: ContextMenuAction[] = [
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
      onClick: deleteEvent,
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
      {menuActions.map((item) => (
        <MenuItem
          key={item.id}
          onClick={() => {
            item.onClick();
            if (onItemClick) {
              onItemClick();
            } else {
              console.log("~~no onItemClick");
            }
          }}
        >
          {item.icon}
          <MenuItemLabel>{item.label}</MenuItemLabel>
        </MenuItem>
      ))}
    </>
  );
}
